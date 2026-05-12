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
ALLOW_PUBLIC_REGISTRATION=false

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

The current backend uses PostgreSQL, not SQLite. Migrations live in `backend/database/migrations/`; run or verify them before production traffic if your cloud database is not initialized from `backend/database/init.sql`.

`schema_migrations` records applied migration files and checksums. `/api/health/deep` compares files on disk with this table and reports pending or checksum-mismatched migrations. New deployments should run:

```bash
cd backend/database
./deploy.sh
```

## File Storage Notes

The storage abstraction is configured through:

- `STORAGE_PROVIDER`: currently `local`; `s3` and `gcs` are reserved for future adapters.
- `UPLOADS_ROOT`: backend upload root.
- `DATA_ROOT`: project data root.
- `UPLOADS_PUBLIC_PATH` and `DATA_PUBLIC_PATH`: public reverse-proxy paths.

The current Compose setup stores uploads in local bind mounts. For multi-instance cloud deployment, move uploads and large raster data to shared object storage or a persistent network volume before scaling horizontally.

Storage adapter contract lives in `backend/src/services/storageService.js`. A future S3/GCS adapter should implement `stat`, `readStream`, `writeStream`, `delete`, and `publicUrl`.

## Compose Profiles

- Production stack: `docker compose --profile prod up -d`
- Local infrastructure only: `docker compose --profile dev up -d`

The `dev` profile starts Postgres and TiTiler with host ports for local `npm run dev`; it does not run the containerized frontend/backend.

## Production Guardrails

- `JWT_SECRET` must be set to a strong non-default value in production.
- Keep `ALLOW_PUBLIC_REGISTRATION=false` in production. Create accounts through the admin user-management endpoint instead.
- `ALLOWED_ORIGINS` should contain only real frontend origins.
- File uploads are governed by `backend/src/config/uploadPolicy.js`; review allowed extensions, MIME types, and size limits before opening the service to public networks.
- Keep Postgres private; do not publish port `5432` publicly.
- Terminate HTTPS at the cloud load balancer or an Nginx TLS layer in front of this stack.
- Run `npm audit` for root, backend, and frontend before release and triage high/critical findings.
