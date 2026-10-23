# Deployment

Target: one Linux VPS (Ubuntu 24.04 LTS assumed below — adjust for other distributions) running Docker Compose behind Nginx with Let’s Encrypt, and MongoDB Atlas. Nothing here assumes you already own a domain or server.

## 0. What you need

| Item               | Notes                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Domain             | Any registrar. You’ll add DNS records (step 2).                                                                                   |
| Server             | 2 vCPU / 4 GB RAM is comfortable (the Next.js build needs ~2 GB). Any provider with Ubuntu 24.04.                                 |
| SSH access         | Give access by **adding a public key** to the server — never share passwords or private keys in chat or email.                    |
| MongoDB Atlas      | M0/M10 cluster in a Mumbai (ap-south-1) region; database user with `readWrite` on `nexus`; IP access list = the server’s IP only. |
| Cloudinary         | Free tier is enough to start. Copy cloud name, API key and secret into the server env file.                                       |
| SMTP (recommended) | Lead emails and password-reset links (e.g. Zoho, Google Workspace, Amazon SES).                                                   |
| MSG91 (for OTP)    | Mobile OTP login/verification. Needs DLT registration; until ready keep `SMS_DRIVER=disabled`.                                    |

## 1. Prepare the server

```bash
# as root, once
adduser --disabled-password deploy && usermod -aG sudo,docker deploy   # after installing Docker below
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx git ufw unattended-upgrades mongodb-database-tools
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
# SSH hardening: in /etc/ssh/sshd_config set PasswordAuthentication no, PermitRootLogin no; then systemctl reload ssh
```

Add your public key (and later the GitHub deploy key) to `/home/deploy/.ssh/authorized_keys`.

## 2. DNS

At your registrar, create:

| Type | Name       | Value                |
| ---- | ---------- | -------------------- |
| A    | `@`        | server IPv4          |
| A    | `www`      | server IPv4          |
| AAAA | `@`, `www` | server IPv6 (if any) |

Wait until `dig +short example.com` returns the server IP.

## 3. Code and secrets

```bash
sudo mkdir -p /srv/nexus && sudo chown deploy: /srv/nexus
su - deploy
git clone https://github.com/Kplgithub/Nexus.git /srv/nexus   # use a read-only deploy key for private repos
cd /srv/nexus
cp deploy/.env.production.example deploy/.env.production && chmod 600 deploy/.env.production
nano deploy/.env.production   # fill every <...> value
```

## 4. Nginx and SSL

```bash
sudo cp deploy/nginx/nexus.conf /etc/nginx/sites-available/nexus.conf
sudo sed -i 's/example.com/YOURDOMAIN.com/g' /etc/nginx/sites-available/nexus.conf
# First certificate: temporarily serve HTTP only
sudo certbot certonly --nginx -d YOURDOMAIN.com -d www.YOURDOMAIN.com
sudo ln -s /etc/nginx/sites-available/nexus.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl status certbot.timer   # automatic renewal
```

## 5. First deploy

```bash
cd /srv/nexus
./deploy/scripts/deploy.sh main
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production exec api node dist/scripts/seed-base.js
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production exec -it -e ADMIN_EMAIL=you@example.com -e ADMIN_NAME="Your Name" api node dist/scripts/seed-admin.js
```

Do **not** run `seed-demo` on production. `seed-base` adds FAQs and settings only — add Jaipur and its localities in Admin → Locations (or run `seed-locations.js` once for a starting list).

## 6. Verify (required before calling it live)

```bash
curl -I https://YOURDOMAIN.com                     # 200, HSTS header present
curl -s https://YOURDOMAIN.com/api/v1/health       # {"ok":true,...,"db":"up"}
curl -s https://YOURDOMAIN.com/robots.txt
curl -s https://YOURDOMAIN.com/sitemap.xml | head
curl -I http://YOURDOMAIN.com                      # 301 → https
```

Then in a browser: sign in to `/admin`, create and publish a property with a photo, find it via search, submit an enquiry, and confirm it appears in Admin → Enquiries. Submit the sitemap in Google Search Console.

## Subsequent deploys

- Manually on the server: `./deploy/scripts/deploy.sh main`
- From GitHub: Actions → **Deploy** → Run workflow (requires the secrets in docs/ENVIRONMENT.md).

## Rollback

Every successful deploy appends its commit to `deploy/.releases`.

```bash
tail deploy/.releases                    # pick the previous good SHA
./deploy/scripts/deploy.sh <sha>
```

Database changes are additive in this codebase; if a future release changes data shape, restore from backup (below) as part of rollback.

## Logs, restarts, monitoring

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production ps
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production logs -f --tail=200 api
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production restart web
```

Containers restart automatically (`restart: unless-stopped`) and on reboot (Docker service is enabled). Container logs rotate at 10 MB × 5; Nginx logs rotate via the distro’s logrotate. Add an uptime monitor (e.g. UptimeRobot) on `/api/v1/health`. Error monitoring (e.g. Sentry) is not configured — add it if wanted.

## Backups and recovery

1. **Atlas** (recommended): enable Cloud Backup / snapshots on the cluster (M10+), or rely on the script below on M0.
2. **Script**: `deploy/scripts/backup-mongo.sh` writes a gzipped `mongodump` archive with 14-day retention.

```bash
crontab -e
15 2 * * * /srv/nexus/deploy/scripts/backup-mongo.sh >> /home/deploy/nexus-backup.log 2>&1
```

Copy archives off the server (e.g. `rclone copy deploy/backups remote:nexus-backups`). Test a restore every few months into a scratch database:

```bash
mongorestore --uri="mongodb+srv://.../nexus_restore_test" --archive=deploy/backups/nexus-YYYYMMDD.archive.gz --gzip --nsFrom='nexus.*' --nsTo='nexus_restore_test.*'
```

Images are stored in Cloudinary and referenced by URL; Cloudinary keeps originals. Enable Cloudinary backup if your plan supports it.

## Alternative: PM2 instead of Docker

```bash
pnpm install --frozen-lockfile && pnpm build
cd apps/api && pm2 start dist/server.js --name nexus-api --env production
cd ../web && pm2 start "pnpm start" --name nexus-web
pm2 save && pm2 startup
```

With PM2, export the same variables (e.g. via `pm2 ecosystem` file outside the repo), set `API_INTERNAL_URL=http://127.0.0.1:4000`, and keep the same Nginx config.

## Data retention and privacy

Enquiries contain personal data. Suggested policy: review and delete or anonymise closed/spam enquiries older than 24 months; restrict CSV exports to the admin role (enforced) and delete exported files after use. Raw IPs are never stored (only a keyed hash).
