# NEXUS Estate | Rentals | Properties

Property marketplace for NEXUS Estate — homes and commercial spaces to buy and rent (launch market: Jaipur; cities and localities are added from the admin, so more can follow without code changes).

- **Public site** — Buy / Rent / Commercial search with server-side filters, property pages, location pages, lead forms, SEO.
- **Accounts** — sign up as Buyer / Owner / Tenant, Agent or Builder; email + password or mobile OTP login; dashboard with listings, leads, saved properties and profile.
- **Posting** — owners, agents and builders post sale or rent listings; every listing is reviewed by staff before it goes live.
- **Admin dashboard** (`/admin`) — review queue, properties, photos, enquiries, website users, locations, FAQs, business settings.
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
packages/shared/   Zod schemas, types, constants and helpers (identical copy in the backend repo)
deploy/            Docker Compose, Nginx, deploy and backup scripts
docs/              Architecture, API, environment, deployment, launch checklist
.github/workflows/ CI and deploy
```

## Two repositories

- **This repo (Kplgithub/Nexus)** — the website (`apps/web`), the production deployment (`deploy/`) and CI.
- **[Kplgithub/Nexus_Backend](https://github.com/Kplgithub/Nexus_Backend)** — the REST API (`apps/api`): models, seed scripts, API tests.

`packages/shared` is kept identical in both. CI (`scripts/check-shared.sh`) and every deploy fail
if the two copies differ, so change it in both repos together.

## Local development

Prerequisites: Node.js 22, pnpm 10 (`corepack enable`), MongoDB 7 running locally (or a free Atlas cluster).

```bash
git clone git@github.com:Kplgithub/Nexus_Backend.git backend   # gitignored; the API
(cd backend && pnpm install && cp apps/api/.env.example apps/api/.env)
# edit backend/apps/api/.env: set JWT_SECRET (openssl rand -base64 48) and MONGODB_URI
(cd backend && pnpm seed:base && pnpm seed:locations && pnpm seed:demo)
(cd backend && ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" pnpm seed:admin)   # prompts for a password
(cd backend && pnpm dev)                                         # API on :4000

pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev                                                         # web on :3000 (/api/v1 is proxied to the API)
```

Open http://localhost:3000 and http://localhost:3000/admin. API docs: http://localhost:4000/api/docs.

### Useful commands

| Command                                      | What it does                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Static checks and unit tests for the website and shared package                   |
| `pnpm test:e2e`                              | Playwright against a running stack (needs `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`) |
| `pnpm build`                                 | Production build of the website                                                   |
| `pnpm check:shared`                          | Compare `packages/shared` with the copy in `./backend`                            |
| `pnpm demo:remove` (in `backend/`)           | Delete all demo listings (and their enquiries) — **run before launch**            |

## Managing the site (admin quick guide)

1. **Locations** — add cities and localities first (several at once, comma separated). Only these appear on the website, in search and in the posting form.
2. **Review queue** — listings posted by owners, agents and builders wait here. Approve to publish, or reject with a note telling the poster what to fix.
3. **Properties → Add property** — staff listings for sale or rent; upload photos, then **Save & publish**. Bedrooms/bathrooms are required only for homes.
4. **Status** — Draft, Pending review, Published, Rejected, Rented/Sold (page stays up, removed from search), Inactive, Archived. Changing a slug keeps the old URL redirecting.
5. **Enquiries** — every lead, including those for user listings; set status, follow-up date, assignee and notes; export CSV (admin role).
6. **Users** — see website accounts, verify agents/builders after checking documents, block abusive accounts (their listings go offline).
7. **Settings** — phone/WhatsApp, email, address (hidden unless enabled), social links, hero text and image, lead-notification email.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](https://github.com/Kplgithub/Nexus_Backend/blob/main/docs/API.md) (backend repo)
- [Environment variables](docs/ENVIRONMENT.md)
- [Deployment, SSL, DNS, backups, rollback](docs/DEPLOYMENT.md)
- [Launch checklist & pending information](docs/LAUNCH_CHECKLIST.md)
- [Test and deployment report](docs/TEST_REPORT.md)

## Content rules

No fabricated reviews, ratings, counts, awards, client logos or business facts. Demo listings are flagged (`isDemo`), badged on the site, `noindex`, excluded from the sitemap and removable in one command. Hero and demo images in `apps/web/public` are original placeholders generated for this project — replace them with real photography before launch.
