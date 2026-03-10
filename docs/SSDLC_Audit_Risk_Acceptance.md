# SSDLC Dependency Audit — Risk Acceptance Record

**Date**: 2026-03-10
**Branch**: `ssdlc-hardening`
**Auditor**: Automated SSDLC hardening pipeline

## Summary

| Metric | Before Overrides | After Overrides |
|--------|-----------------|-----------------|
| Critical | 9 | **0** |
| High | 10 | **4** |
| Moderate | 7 | **5** |
| Low | 5 | **11** |
| **Total** | **31** | **20** |

## Applied npm Overrides (frontend/package.json)

| Package | Override Version | Fixes |
|---------|-----------------|-------|
| `minimist` | 1.2.8 | Prototype Pollution (Critical) via optimist, quote-stream, togeojson, wellknown, csv2geojson |
| `xmldom` | `npm:@xmldom/xmldom@^0.8.10` | Malicious XML parsing (Critical) via togeojson -> leaflet-omnivore |
| `braces` | 3.0.3 | Uncontrolled resource consumption (High) via webpack@4 -> georaster |
| `micromatch` | 4.0.8 | ReDoS (Moderate) via webpack@4 -> georaster |
| `serialize-javascript` | 7.0.4 | RCE via RegExp.flags (High) via terser-webpack-plugin -> webpack@4 |
| `elliptic` | 6.6.1 | Risky implementation (Low) via crypto-browserify -> node-libs-browser -> webpack@4 |

## Accepted Risks

### 1. static-eval / static-module / brfs (HIGH — Frontend)

- **Packages**: static-eval@2.1.1, static-module@3.0.4, brfs@2.0.2
- **Vulnerability**: Sandbox Breakout / Arbitrary Code Execution
- **Root cause**: leaflet-omnivore depends on brfs -> static-module -> static-eval. No patched versions exist.
- **Why accepted**: leaflet-omnivore is actively used (`ProjectMap.vue` line 2313 for KML file loading via `L.omnivore.kml()`). No maintained alternative. These packages run at build-time only (brfs is a browserify transform), not at runtime in production.
- **Mitigation**: Input KML files come from trusted admin uploads only, not arbitrary user input.
- **Review date**: Re-evaluate when leaflet-omnivore publishes a new major version or alternative emerges.

### 2. vite / vitest / esbuild (MODERATE — Frontend, dev-only)

- **Packages**: vite@4.5.14, vitest@2.1.9, esbuild@0.18.20, @vitest/mocker, vite-node
- **Vulnerabilities**: Server filesystem bypass, request forwarding
- **Why accepted**: These are **dev-only** dependencies. They never ship to production (Vite builds static assets). The vulnerabilities affect `vite dev` server, which only runs on developer machines on localhost.
- **Mitigation**: Do not expose Vite dev server to network. Production uses pre-built static files served by Nginx.
- **Review date**: Consider upgrading Vite to v5/v6 in a future sprint (breaking change, separate effort).

### 3. elliptic (LOW — Frontend, transitive)

- **Package**: elliptic@6.6.1 (overridden to latest)
- **Vulnerability**: Uses a risky cryptographic primitive implementation
- **Why accepted**: Already at latest version (6.6.1). Transitive via webpack@4 -> node-libs-browser -> crypto-browserify. This is webpack@4's Node.js polyfill for browsers — not used for actual cryptographic operations in our app.
- **Mitigation**: None needed. georaster depends on webpack@4 which bundles this.

### 4. xlsx (HIGH — Backend, 1 vulnerability)

- **Package**: xlsx (SheetJS)
- **Vulnerability**: 1 high severity
- **Usage**: `backend/src/controllers/warningRegionController.js` lines 1269, 1274 — `XLSX.readFile()` and `XLSX.utils.sheet_to_json()` for warning region data import.
- **Why accepted**: xlsx is the de facto standard for Excel file parsing in Node.js. The vulnerability is related to crafted spreadsheet files. Files are uploaded by trusted admin users only.
- **Mitigation**: Restrict file upload to authenticated admin role. Validate file size limits (implemented in Wave 2 body size limits).
- **Review date**: Monitor for xlsx security patches or consider migration to ExcelJS if a critical exploit is published.

### 5. webpack@4 transitive chain (LOW — Frontend)

- **Packages**: webpack@4.47.0, worker-loader@2.0.0, terser-webpack-plugin@1.4.6, node-libs-browser, watchpack, watchpack-chokidar2
- **Why accepted**: georaster@1.6.0 depends on worker-loader@2 which requires webpack@4. This entire chain is only used at build-time for the georaster web worker bundle. Cannot be upgraded without forking georaster.
- **Mitigation**: npm overrides handle the individual vulnerable transitive deps (braces, serialize-javascript, micromatch, minimist). Remaining are informational/low.

## Backend Audit Status

```
Backend: 1 vulnerability (xlsx — HIGH, accepted above)
```

No overrides needed for backend.
