# Test and deployment report

_Last updated: 21 October 2026_

## Summary

| Check                           | Status                                                                                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependencies installed          | ❌ Not possible in the authoring environment — npm registry blocked by its network policy                                                                                                                                                                          |
| Formatting (Prettier 3.8)       | ✅ Whole repo passes `prettier --check`                                                                                                                                                                                                                            |
| Type check — shared + API       | ✅ No errors, checked against type definitions fetched from source (zod 4, Mongoose 8, MongoDB driver 6, Express 5 / DefinitelyTyped, helmet, express-rate-limit, pino, pino-http, cloudinary). argon2, vitest and mongodb-memory-server types were not available. |
| Type check — web                | ⚠️ Partial: checked against React 19 types; Next.js types were not available, so `next/*` imports were unchecked                                                                                                                                                   |
| Shared package tests            | ✅ 27/27 passed, run against zod compiled from source with a minimal test-runner shim                                                                                                                                                                              |
| Web search-param tests          | ✅ 5/5 passed (same method)                                                                                                                                                                                                                                        |
| API tests (Supertest + MongoDB) | ❌ Not run — needs Express/Mongoose/MongoDB binaries                                                                                                                                                                                                               |
| Lint, production build, E2E     | ❌ Not run                                                                                                                                                                                                                                                         |
| GitHub push                     | See the latest commit on `main`                                                                                                                                                                                                                                    |
| Production deployment           | ❌ Not started — no server, domain or credentials yet                                                                                                                                                                                                              |

The authoritative verification is CI (`.github/workflows/ci.yml`), which runs every check on GitHub’s runners. Expect a round of small fixes (lint rules, dependency versions) on the first run.

## Tests written

**`packages/shared`** — phone normalisation (Indian formats, international opt-in), WhatsApp links, slugs, rent/area formatting, search-param sanitising (invalid values dropped, inverted ranges swapped, cross-category types removed), property validation (bedrooms required for homes not offices, negative rent, wrong-category type, publish without photos, markup stripping), enquiry consent.

**`apps/api`** (Supertest + in-memory MongoDB)

- Auth: uniform login errors, cookie flags, 401 without session, CSRF required on writes, foreign Origin rejected, lockout after 5 failures, logout-all revokes old tokens, role hierarchy, no stack traces.
- Properties: create/validate, conditional bedroom rules, rent validation, unknown locality, slug uniqueness and conflicts, publish requires photos, PATCH doesn’t reset unsent fields, area normalisation, publish/unpublish visibility, rented pages, unlisted visibility, private fields never public, slug-change redirects, delete.
- Search: category, rent range, city/locality, min bedrooms, type/furnishing/amenities/parking, sorting, pagination, invalid params, operator injection, similar listings, location counts, OpenAPI coverage.
- Enquiries: save with lead ID/normalised phone/snapshot/consent, invalid phone, international toggle, consent required, markup stripping, honeypot/too-fast spam handling, duplicate collapse, `$` operator stripping, admin list/search/update/notes/follow-ups/CSV, CSV formula-injection escaping, landlord submissions.
- Uploads: byte-level type detection, disguised files rejected per file, auth required, size limit.
- Full journey for residential and commercial at API level.

**`apps/web`** — search-param round-tripping (Vitest); Playwright: home brand/search/JSON-LD/WhatsApp, URL-persisted filters + noindex, invalid filters, 404, robots/sitemap, admin redirect + noindex, form validation, and the complete admin → publish → search → enquire → admin-update journey for both categories, on desktop and mobile viewports.

## Known gaps / follow-ups

- Results above will be replaced with real outcomes once CI has run.
- Lighthouse/Core Web Vitals not measured yet.
- Error monitoring (e.g. Sentry) not configured.
- Public pages cache listing data for up to `REVALIDATE_SECONDS` (60 s); admin changes appear within that window.
