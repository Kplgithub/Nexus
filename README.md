# NEXUS Estate | Rentals | Properties

Residential and commercial rental platform for NEXUS Estate (launch market: Jaipur, Rajasthan).

- **Public site** — search with real server-side filters, property pages, location pages, lead forms, SEO.
- **Admin dashboard** (`/admin`) — properties, photos, enquiries, owner submissions, locations, FAQs, business settings.
- **REST API** (`/api/v1`) — Express + MongoDB, documented with OpenAPI at `/api/docs`.

> **Status:** MVP code complete. Type-checked and partially unit-tested offline; full install, API tests, build and E2E run in CI (the authoring sandbox could not reach the npm registry). See [docs/TEST_REPORT.md](docs/TEST_REPORT.md).

## Stack

| Layer    | Choice                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------- |
| Web      | Next.js 16 (App Router, Server Components), React 19, TypeScript, Tailwind CSS 4                    |
| API      | Node.js 22, Express 5, TypeScript, Zod validation, Mongoose 8                                       |
| Database | MongoDB 8 (MongoDB Atlas recommended)                                                               |
| Images   | Cloudinary (production) / local disk (development only)                                             |
| Auth     | Argon2id passwords, httpOnly session cookie (JWT) + CSRF token, role-based (owner › admin › editor) |
| Tests    | Vitest + Supertest + mongodb-memory-server (API), Vitest (shared/web), Playwright (E2E)             |
| Deploy   | Docker Compose behind Nginx + Let’s Encrypt; GitHub Actions CI and manual deploy workflow           |

Package versions are caret ranges in each `package.json`; the exact resolved versions are pinned by `pnpm-lock.yaml` once generated (see “First install”).

## Repository layout

```
apps/web/          Next.js site + admin UI
apps/api/          Express API, models, services, seed scripts, tests
packages/shared/   Zod schemas, types, constants and helpers shared by both
deploy/            Docker Compose, Nginx, deploy and backup scripts
docs/              Architecture, API, environment, deployment, launch checklist
.github/workflows/ CI and deploy
```

## Local development

Prerequisites: Node.js 22, pnpm 10 (`corepack enable`), MongoDB 7+ running locally (or a free Atlas cluster).

```bash
pnpm install                       # first time: also creates pnpm-lock.yaml — commit it
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit apps/api/.env: set JWT_SECRET (openssl rand -base64 48) and MONGODB_URI

pnpm seed:base                     # Jaipur + localities, starter FAQs, default settings
ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" pnpm seed:admin   # prompts for a password
pnpm seed:demo                     # optional: clearly-labelled demo listings
pnpm dev                           # web on :3000, API on :4000 (/api/v1 is proxied by Next)
```

Open http://localhost:3000 and http://localhost:3000/admin. API docs: http://localhost:4000/api/docs.

### Useful commands

| Command                                      | What it does                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Static checks and unit/API tests                                                  |
| `pnpm test:e2e`                              | Playwright against a running stack (needs `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`) |
| `pnpm build`                                 | Production build of all packages                                                  |
| `pnpm demo:remove`                           | Delete all demo listings (and their enquiries) — **run before launch**            |
| `pnpm --filter @nexus/api db:indexes`        | Create/update MongoDB indexes (run on each production deploy)                     |

## Managing the site (admin quick guide)

1. **Locations** — add cities/localities first; write a short, genuine intro for localities you want indexed.
2. **Properties → Add property** — fill the form, upload photos (choose cover, add alt text), then **Save & publish**. Bedrooms/bathrooms are required only for homes.
3. **Status** — Draft (hidden), Published, Rented (page stays up, removed from search), Inactive, Archived. Changing a slug keeps the old URL redirecting.
4. **Enquiries** — new leads appear here; set status, follow-up date, assignee and private notes; export CSV (admin role).
5. **Owner submissions** — requests from “List your property”.
6. **Settings** — phone/WhatsApp, email, address (hidden unless enabled), social links, hero text, lead-notification email.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Deployment, SSL, DNS, backups, rollback](docs/DEPLOYMENT.md)
- [Launch checklist & pending information](docs/LAUNCH_CHECKLIST.md)
- [Test and deployment report](docs/TEST_REPORT.md)

## Content rules

No fabricated reviews, ratings, counts, awards, client logos or business facts. Demo listings are flagged (`isDemo`), badged on the site, `noindex`, excluded from the sitemap and removable in one command. Hero and demo images in `apps/web/public` are original placeholders generated for this project — replace them with real photography before launch.
