# Selected Project Sharing and Reports

## Objective

Add per-project read-only sharing and PDF/Word export to DisasterCollection and EarlyWarning. Confirmed preferences: selected project only, no guest account, seven-day default expiry, revocation, PDF plus editable DOCX. Use the existing project and region records, not a fixed set of four IDs. A disaster-location report includes its child investigations; a warning report belongs to one region ID, never all regions sharing a road code.

## Contracts and Boundaries

- Authenticated editor/admin: create and revoke shares. Authenticated readers: preview and export project reports.
- Guest: scoped reads only. Never promote a share capability to the existing account authentication context.
- Store SHA256 of a random 256-bit token, not the token. Return plaintext only on creation. Recheck expiry, revocation and project deletion on subsequent reads.
- Share URL uses a fragment so the secret is not sent to server access logs or external Referer headers. API requests carry X-Share-Token; responses use no-store and noindex.
- Project-specific assets must be selected from database-owned records and resolved through existing safe storage helpers, not client-supplied paths or remote URLs.
- Reports and guest data must exclude authentication configuration, account records, API secrets and internal storage paths. Missing/historical upstream observations remain explicitly missing/historical, never green or zero by default.
- Downloaded reports and previously downloaded media cannot be recalled through revocation.
- User approved restricting legacy anonymous project-data reads. Account-protected APIs and stored files require authentication; public basemaps remain public. Short-lived, path-bound asset grants keep server-side TiTiler reads working without exposing a general account credential.
- Additive migration only. Never reset/sync-alter existing databases. No deployment or main merge is authorized by this feature request.

## Implementation Shape

Backend in backend/src/services and backend/src/routes: one bounded selected-project snapshot for guest display, report preview and both document formats; share persistence uses Sequelize, validated IDs and ownership checks. Reuse existing monitoring normalization rather than inventing a parallel interpretation. PDF/DOCX generation uses maintained document libraries and an OFL Chinese font; map/plot images are generated from the actual selected data, and unavailable photos or upstream data are explicitly noted.

Frontend in frontend/src/components/project and frontend/src/views: small reusable project actions, accessible share/report dialogs, one guest route without global admin navigation. Keep existing restrained typography, brand colors and map/chart components. Use real project records and media, not decorative stock imagery. Export code is lazy/on-demand where appropriate.

Proposed endpoints: authenticated /api/project-publications/:kind/:id for preview, shares and report downloads; anonymous /api/shared-project for the capability-scoped view and its assets. Kind is disaster or warning. No arbitrary model/table/URL selections from request input.

## Testing and Commands

```bash
npm --prefix backend test -- --runTestsByPath tests/project-sharing.test.js tests/project-reports.test.js
GEOPORT_TEST_PG_SOCKET=/tmp/geoport-pg-audit.uWMqsr npm test
npm run build
```

Test expired/revoked/malformed capabilities, project-A/project-B and same-road region boundaries, missing/deleted targets, writes with guest credentials, path traversal/symlinks, safe errors and secret-free request logs. Verify both PDF/DOCX for Chinese text, long titles/tables, empty data, chart pixels, source/observation timestamps and photo failures. Render documents with the bundled verification runtime; visually inspect all fixture pages. Browser checks cover desktop/mobile, anonymous links, copy/revoke/download, network failures and no application console output.

Style follows existing Vue Options API and backend ESM, explicit Sequelize field selection and small scoped services. Example response: { success: true, data: { kind, project, generatedAt, records, media, charts, warnings } }. Use plain text, Vue escaping and bounded collections; never insert user HTML into reports or map popups.

## UI References

This is a work-focused GIS tool, not a landing page. Share dialogs identify the selected project, show read-only access and the actual expiry date, offer copy and revoke, and preserve focus on close. Report controls offer a preview and explicit PDF/Word download choices. Keep actions compact and responsive, using familiar share/download/copy icons with accessible labels.

- Google Drive access management: https://support.google.com/drive/answer/7166529
- Microsoft OneDrive sharing and expiry: https://support.microsoft.com/en-us/onedrive/share-files-and-folders-in-microsoft-onedrive
- Microsoft manage-link access: https://support.microsoft.com/en-us/onedrive/sharepoint/manage-sharing-and-permissions-in-onedrive-and-sharepoint
- Notion page-level permissions: https://www.notion.com/help/sharing-and-permissions
- Notion public page lifecycle: https://www.notion.com/help/public-pages-and-web-publishing

## Shipped Behavior and Operations

- Both functional pages and disaster-project detail headers have share/report actions. The public route is `/shared-project#<secret>` with no account or management navigation.
- Snapshots list at most 200 items per collection, 200 child projects, 10,000 samples per chart and eight report photos. Counts and explicit truncation notices distinguish the full source from the exported subset. The guest map offers up to 20 selected-project layers.
- PDF and DOCX embed a real OpenStreetMap basemap, selected-project markers, selected warning-road geometry, a north arrow, scale and visible attribution. Maps fit actual coordinates or owned road geometry; they do not substitute a coordinate grid for an unavailable basemap. Missing geographic data is labelled; provider failures return a retryable 503.
- Only the tiles needed for the current exported map viewport are fetched from the fixed HTTPS OSM endpoint, with an identifying User-Agent and a seven-day on-disk cache. No document-supplied external URL is fetched. See the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Set `REPORT_MAP_CACHE_DIR` to durable, writable storage in production; its default is the operating-system temporary directory. Cached tiles are public basemap imagery, not project overlays.
- Apply only the additive `043_create_project_shares.sql` migration and record its checksum in the existing migration ledger. Back up first; never use full database initialization, reset or sync-alter on the existing database.
- Authenticated private API reads establish a short-lived HttpOnly asset cookie. Browser fetches only attach account authorization to configured API/static paths, never third-party URLs. TiTiler gets path-bound, five-minute grants rather than account JWTs. Keep proxy logs query-free and TiTiler access logging disabled because tile URLs carry these short-lived grants.
- The freely licensed Iansui Kai-style font is bundled for report previews and embedded in PDF and Word. Body text, metadata and captions are fixed at 12pt; headings use the same face and size with bold hierarchy in preview/Word. Editors that ignore embedded fonts need Iansui installed; PDF preserves the intended layout independently of the viewer's fonts. No proprietary system BiauKai font is redistributed.
- Local acceptance used isolated fixtures for all share creation, revocation, expiry and deletion tests. Existing four projects were read-only, all eight report files exported, and the pre-migration database backup was retained locally. No production deployment or main merge was performed. Git push was separately authorized after implementation.

## Standard Report Content

- Specification version 1.0 fixes six sections: basic information, event/current-record overview, location/maps, investigation records, monitoring, and pending questions/data limitations. Guest views, authenticated previews, PDF and editable Word use the same server content contract.
- Main text contains at most five selected investigation/inspection records and four photo descriptors. Photos are matched only through their database-owned source project ID and placed directly beside/after that investigation, with one representative per investigation prioritized before extras. Appendix-only investigations keep their images in the appendix; filenames/dates never invent associations. The same grouping and numbering are used by preview, PDF and Word, with at most eight embedded/previewed photos. Independent images retain their own captions; the preview appendix is initially collapsed.
- Event dates, inspection dates, image capture dates, registration dates and upload dates remain distinct. Missing observation dates are not replaced with upload dates. Normalized rainfall observation instants are preserved, with validated epoch fallback and no guessed local timezone.
- Missing data does not imply no disaster or a zero value. System event classification is not a confirmed disaster count; historical monitoring is not current safety, and rainfall coincidence is not a causal assessment.
- Record counts disclose the full database count and the captured subset, including warning-region layers. Long text and nested records are bounded and sanitized; the appendix never promises an unabridged original. Truncated strings are labelled and readers are directed to the original records.
- Verification covers the six-section content, bounded evidence selection, 12pt Kai typography, selected-project permissions and actual output order. Production builds retain existing bundle-size/dynamic-import warnings. Isolated desktop/mobile guest, revoke and document-download browser checks passed; all four existing projects were checked read-only and exported to both formats. PDF/Word rendering checks include Chinese text, real basemaps, charts and evidence captions. Paired preview checks cover 1440px desktop plus 390px and 320px mobile with no cross-record image association.
- Final suite results: 386 backend, 115 frontend and two TiTiler tests passed; nine opt-in HTTP/database sharing tests passed separately. One pre-existing TODO remains. The new ownership, appendix-only image and fixed-size font regressions are included.

Additional checks:

```bash
npm --prefix backend test -- --runTestsByPath tests/project-report-map.test.js tests/project-reports.test.js tests/project-snapshot.test.js
# Supply an isolated, migrated DB_NAME_TEST beginning with geoport_publications_.
RUN_PUBLICATION_INTEGRATION=1 npm --prefix backend test -- --runTestsByPath tests/project-publication-integration.test.js
# The browser script consumes a private fixture manifest generated by isolated acceptance.
node scripts/check-project-publications-browser.mjs
```
