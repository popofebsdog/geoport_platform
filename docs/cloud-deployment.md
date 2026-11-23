# GeoPort Cloud Deployment Checklist

GeoPort is prepared for a containerized cloud deployment with a single public HTTP entrypoint.

## Runtime Topology

Public traffic should enter through Nginx only:

- `/` -> frontend static app
- `/api/*` -> backend Express API
- `/uploads/*` -> backend uploaded files
- `/data/*` -> backend project data
- `/titiler/*` -> TiTiler COG service

Internal services:

- `frontend`: Nginx serving Vite build on port `5173`
- `backend`: Express API on port `3001`
- `titiler`: TiTiler on container port `8000`
- `postgres`: PostgreSQL on port `5432`

## Required Environment Variables

Copy `.env.example` to `.env` on the server and set real values:

```bash
DB_NAME=geoport
DB_USER=geoport_user
DB_PASSWORD=<strong database password>
DB_SSL=false

JWT_SECRET=<strong random secret>
JWT_EXPIRES_IN=24h

FRONTEND_URL=https://your-domain.example
ALLOWED_ORIGINS=https://your-domain.example
TRUST_PROXY=1
TITILER_INTERNAL_URL=http://titiler:8000

STORAGE_PROVIDER=local
UPLOADS_ROOT=/app/uploads
DATA_ROOT=/app/data
UPLOADS_PUBLIC_PATH=/uploads
DATA_PUBLIC_PATH=/data

HTTP_PORT=80
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not commit real `.env` files or secrets.

## Build And Start

```bash
docker compose --profile prod build
docker compose --profile prod up -d
```

Only Nginx is published to the host. Backend, TiTiler, and Postgres are reachable only inside the Docker network.

## Smoke Tests

Replace `https://your-domain.example` with the deployment URL.

```bash
curl -fsS https://your-domain.example/api/health
curl -fsS https://your-domain.example/api/health/deep
curl -fsS https://your-domain.example/titiler/healthz
curl -I https://your-domain.example/
```

Expected:

- `/api/health` returns `status: "OK"`
- `/api/health/deep` returns `status: "ok"` or `status: "warning"` with component details
- `/titiler/healthz` returns TiTiler versions
- `/` returns the frontend app

## Database Notes

The current backend uses PostgreSQL, not SQLite. `backend/database/init.sql` creates extensions, types and shared functions; it does not create the application tables. Always run or verify `backend/database/migrations/` before production traffic, including when Docker has already run `init.sql`.

`schema_migrations` records applied migration files and checksums. `/api/health/deep` compares files on disk with this table and reports pending or checksum-mismatched migrations. New deployments should run:

```bash
cd backend/database
./deploy.sh
```

For an existing database, answer **N** to the recreate prompt. Back up the database and uploaded files before upgrading; never delete a volume to resolve a migration failure.

Initialization supplies a `chinese` full-text configuration using PostgreSQL's built-in `simple` dictionary only when no visible configuration exists. This supports token indexing without an extra parser dependency; it does not provide Chinese word segmentation. Existing custom configurations are preserved.

The fresh-install replay fixes correct `001`/`005` dependency and index definitions, and retire the fictional data inserts in `021`/`022`. Existing rows and files are not removed. `014a` is a new migration that commits the CSV enum value before `015` uses it, adds the missing temporal coordinates and backfills the project temporal counter.

Deployments that previously recorded the old `001`, `005`, `021` or `022` contents may report checksum differences. The deployment script skips their applied versions; it does not repair their previous partial effects or overwrite their recorded checksums. `042` adds the missing search objects without replaying seeds. For the four recognized legacy file hashes, `database/reconcile_legacy_migrations.js` provides an explicit verified upgrade: require a restored backup and fresh-schema evidence, lock writes briefly, compare all business-table fingerprints, apply pending repairs in one transaction and journal each old/new checksum with backup and schema hashes before updating the ledger. Unknown hashes, schema differences or changed business data abort the transaction. Existing `applied_at` timestamps remain intact. Do not change checksums merely to make health checks pass.

The schema reference must come from a clean migration replay, never from the database being repaired. PostgreSQL may render equivalent array casts differently after a dump/restore, so independently generated clean and clean-roundtrip reference variants can be supplied; each comparison remains exact. The integration tests cover refusal and rollback as well as idempotence. This is a targeted legacy transition, not a general checksum-reset command.

Backend regression tests run with `npm run test:backend`. The optional PostgreSQL integration suite additionally uses `GEOPORT_TEST_PG_SOCKET`: a separately initialized temporary cluster, Unix socket port `55439`, role `geoport_audit`, with PostGIS installed. Never point it at the application database. It verifies fresh replay, rerun, checksums, search configuration preservation, temporal writes/counters and administrator setup.

## File Storage Notes

Node containers use Node 22; local packages support Node 20.19.x or 22.12 through 24.x. Local TiTiler uses the Python 3.11 dependency lock in `backend/requirements-titiler.txt`. Compose pins the verified TiTiler `0.24.2` image, which is published for `linux/amd64`; ARM hosts require Docker emulation. The image version and the local Python runtime are tested separately.

See the [Operations Runbook](operations-runbook.md) for releases, readiness, correlated logs, full backups, restore acceptance and remaining external setup.

Frontend `VITE_API_URL`, `VITE_STATIC_URL` and `VITE_TITILER_URL` are browser-facing build-time URLs. Compose sets `VITE_TITILER_ASSET_ORIGIN=http://backend:3001` so the TiTiler container reads local COGs from the backend, not its own localhost. CDN/static URL prefixes are not forwarded to this backend origin. Rebuild the frontend when changing these values; changing container runtime environment alone cannot change the built bundle.

The storage abstraction is configured through:

- `STORAGE_PROVIDER`: currently `local`; `s3` and `gcs` are reserved for future adapters.
- `UPLOADS_ROOT`: backend upload root.
- `DATA_ROOT`: project data root.
- `UPLOADS_PUBLIC_PATH` and `DATA_PUBLIC_PATH`: public reverse-proxy paths.

The current Compose setup stores uploads in local bind mounts. For multi-instance cloud deployment, move uploads and large raster data to shared object storage or a persistent network volume before scaling horizontally.

All local upload, read, generated-file and delete paths use `UPLOADS_ROOT`/`DATA_ROOT`. New database storage paths remain portable `uploads/...` or `data/...` namespaces. Changing roots does not copy existing files: move or mount the actual contents first. Unsupported object adapters, unreadable/unwritable roots and missing core database tables make `/api/health/deep` return HTTP 503. Pending migrations remain visible as warnings.

Database backups use `BACKUP_ROOT=/app/backups` and a separate Compose named volume. Container rebuilds retain them; `docker compose down -v` does not. See [Backup And Recovery](backup-recovery.md) for backup, export and restore constraints. Git and image builds exclude backup files and local Python environments.

Request logs record the pathname without query parameters. URL query strings, fragments and credentials are also removed from logged URL metadata and error messages/stacks; sensitive object keys remain masked.

Storage adapter contract lives in `backend/src/services/storageService.js`. A future S3/GCS adapter should implement `stat`, `readStream`, `writeStream`, `delete`, and `publicUrl`.

## Compose Profiles

- Production stack: `docker compose --profile prod up -d`
- Local infrastructure only: `docker compose --profile dev up -d`

The `dev` profile starts Postgres and TiTiler with host ports for local `npm run dev`; it does not run the containerized frontend/backend.

## Production Guardrails

- `JWT_SECRET` must be set to a strong non-default value in production.
- Public registration is unavailable in every environment. The existing highest `admin` role creates accounts through `/users` or `POST /api/auth/users`; editor and viewer roles cannot manage accounts.
- This authentication update requires existing sessions to sign in again. Subsequent requests check the current account status and role; password resets invalidate all prior tokens without changing the database schema.
- `ALLOWED_ORIGINS` should contain only real frontend origins.
- File uploads are governed by `backend/src/config/uploadPolicy.js`; review allowed extensions, MIME types, and size limits before opening the service to public networks.
- Keep Postgres private; do not publish port `5432` publicly.
- Terminate HTTPS at the cloud load balancer or an Nginx TLS layer in front of this stack.
- Run `npm audit` for root, backend, and frontend before release and triage high/critical findings.
