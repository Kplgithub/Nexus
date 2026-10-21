# Launch checklist

## Pending business information (please supply or approve)

| Item                                                                                   | Where it goes                                                                                                          | Status                     |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Official logo                                                                          | `apps/web/public/brand/`                                                                                               | ✅ Received (teal version) |
| Phone / WhatsApp +91 95217 50202                                                       | Admin → Settings                                                                                                       | ✅ Set as default          |
| Business email                                                                         | Admin → Settings                                                                                                       | ⏳ Needed                  |
| Office address — or decision to keep it private                                        | Admin → Settings (“Show address” is off by default)                                                                    | ⏳ Needed                  |
| Business hours                                                                         | Admin → Settings                                                                                                       | ⏳ Optional                |
| Social media URLs                                                                      | Admin → Settings                                                                                                       | ⏳ Optional                |
| Approval of website copy (home, about, service text, FAQs)                             | Pages in `apps/web/src/app/(site)` and Admin → FAQs                                                                    | ⏳ Review                  |
| Legal pages reviewed by a lawyer (privacy, terms, cookies)                             | `/privacy-policy`, `/terms-and-conditions`, `/cookie-policy` — currently say “Last updated: To be confirmed at launch” | ⏳ Review                  |
| Locality introductions (4 drafted: Vaishali Nagar, Malviya Nagar, Jagatpura, C-Scheme) | Admin → Locations                                                                                                      | ⏳ Review / write more     |
| Real property photographs and listings                                                 | Admin → Properties                                                                                                     | ⏳ Needed                  |
| Licensed hero photograph (current one is an original generated placeholder)            | Admin → Settings → Hero image URL                                                                                      | ⏳ Recommended             |
| Brokerage/fee policy wording (if you want it public)                                   | Per listing “Brokerage” field / Terms                                                                                  | ⏳ Optional                |

## Accounts and credentials (set up by you; secrets go on the server, not in chat)

- [ ] Domain registered; DNS A/AAAA records pointing to the server
- [ ] VPS created; your SSH public key added
- [ ] MongoDB Atlas cluster, DB user, IP allow-list = server IP
- [ ] Cloudinary account (cloud name, API key, secret)
- [ ] MSG91 account with a DLT-registered sender ID and OTP template (for mobile OTP login and verification); set `SMS_DRIVER=msg91`
- [ ] SMTP account for lead emails and password-reset links (recommended)
- [ ] GitHub Actions secrets for the Deploy workflow (optional)
- [ ] Google Search Console property (verify via DNS TXT)

## Technical go-live

- [ ] CI green on `main` (lint, typecheck, tests, build, E2E)
- [ ] `pnpm-lock.yaml` committed
- [ ] `deploy/.env.production` complete; `ENABLE_API_DOCS=false`; `COOKIE_SECURE=true`; strong `JWT_SECRET`
- [ ] HTTPS working, HTTP→HTTPS and www→apex redirects
- [ ] `/api/v1/health` returns `db: up`
- [ ] Indexes synced (`deploy.sh` does this)
- [ ] Owner admin created with `seed-admin`; additional staff accounts with `editor` role
- [ ] Cities and localities added in Admin → Locations (only these appear on the website)
- [ ] Signup → OTP → post listing → admin approval tested on production with a real phone
- [ ] **Demo data removed** (`pnpm demo:remove`) and no demo images left (the script warns)
- [ ] At least one real published listing per category you advertise
- [ ] Full journey tested on production (admin → publish → search → enquiry → admin update)
- [ ] Terms and privacy policy reviewed for user accounts and user-posted listings
- [ ] Lead email received (if SMTP configured)
- [ ] Backups scheduled and one restore tested
- [ ] Uptime monitor on `/api/v1/health`
- [ ] Sitemap submitted in Search Console; `NEXT_PUBLIC_NOINDEX` is `false`
- [ ] Lighthouse run on home, listing and property pages (mobile)
