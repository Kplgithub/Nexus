#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server (e.g. a DigitalOcean droplet) for NEXUS Estate.
#
#   ssh root@SERVER_IP, then paste the bootstrap commands from docs/DEPLOYMENT.md ("First-time
#   server setup"): they give the server read access to this private repo and run this script.
#
# It asks a few questions, then: hardens the server, installs Docker + Nginx, creates a `deploy`
# user, clones the website to /srv/nexus and the backend (Kplgithub/Nexus_Backend) to
# /srv/nexus/backend with read-only deploy keys, writes deploy/.env.production (secrets are generated or typed
# here, never sent anywhere else), gets an HTTPS certificate, builds and starts the site, seeds
# FAQs/settings, creates the first admin, schedules backups and prepares a key for GitHub deploys.
# Safe to re-run: finished steps are skipped and an existing .env.production is kept.
set -euo pipefail

REPO_URL="${REPO_URL:-git@github-nexus-web:Kplgithub/Nexus.git}"
BACKEND_URL="${BACKEND_URL:-git@github-nexus-backend:Kplgithub/Nexus_Backend.git}"
APP_DIR=/srv/nexus
DEPLOY_USER=deploy
ENV_FILE="$APP_DIR/deploy/.env.production"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[31mStopped:\033[0m %s\n' "$*" >&2; exit 1; }
ask() { local v; read -r -p "  $1: " v </dev/tty; printf '%s' "$v"; }
ask_secret() { local v; read -r -s -p "  $1: " v </dev/tty; echo >&2; printf '%s' "$v"; }
as_deploy() { sudo -u "$DEPLOY_USER" -H bash -c "cd '$APP_DIR' && $*"; }

[ "$(id -u)" -eq 0 ] || die "Run as root (ssh root@SERVER_IP, then bash server-setup.sh)."
. /etc/os-release
[ "${ID:-}" = ubuntu ] || warn "Tested on Ubuntu 24.04; this is $PRETTY_NAME."

# ------------------------------------------------------------------ questions
bold "NEXUS Estate server setup"
FRESH_ENV=1
if [ -f "$ENV_FILE" ]; then
  FRESH_ENV=0
  DOMAIN="$(grep -E '^PUBLIC_SITE_URL=' "$ENV_FILE" | sed -E 's#^PUBLIC_SITE_URL=https?://##')"
  ok "Existing settings found for $DOMAIN — they will be kept."
  SSL_EMAIL="$(ask 'Email for SSL certificate notices')"
  SEED_LOCATIONS=n
else
  DOMAIN="$(ask 'Domain without www (e.g. nexusestate.in)')"
  DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN#www.}"; DOMAIN="${DOMAIN%/}"
  [[ "$DOMAIN" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]] || die "That doesn't look like a domain: $DOMAIN"
  SSL_EMAIL="$(ask 'Email for SSL certificate notices')"

  echo
  echo "  Database:"
  echo "    1) On this server (simplest; nightly backups are set up for you)"
  echo "    2) MongoDB Atlas (managed; paste its connection string)"
  DB_CHOICE="$(ask 'Choose 1 or 2 [1]')"
  if [ "${DB_CHOICE:-1}" = 2 ]; then
    MONGODB_URI="$(ask_secret 'Atlas connection string (hidden)')"
    [[ "$MONGODB_URI" == mongodb* ]] || die "The connection string should start with mongodb+srv://"
    USE_LOCAL_MONGO=false
  else
    USE_LOCAL_MONGO=true
  fi

  echo
  echo "  Cloudinary (property photos) — from cloudinary.com → Dashboard → API Keys:"
  CLD_NAME="$(ask 'Cloud name')"
  CLD_KEY="$(ask 'API key')"
  CLD_SECRET="$(ask_secret 'API secret (hidden)')"
  [ -n "$CLD_NAME" ] && [ -n "$CLD_KEY" ] && [ -n "$CLD_SECRET" ] ||
    die "Cloudinary details are required for photo uploads in production."

  SEED_LOCATIONS="$(ask 'Add Jaipur with 15 sample localities now? You can edit them in Admin → Locations (y/n) [y]')"
fi
SEED_LOCATIONS="${SEED_LOCATIONS:-y}"

# ------------------------------------------------------------------ system
bold "1/8  System packages and security"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq nginx certbot git ufw fail2ban unattended-upgrades curl dnsutils >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true
systemctl enable --now fail2ban >/dev/null 2>&1 || true
ok "Packages, automatic security updates and fail2ban"

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
systemctl enable --now docker >/dev/null
ok "Docker $(docker --version | awk '{print $3}' | tr -d ,)"

# The Next.js build needs ~2 GB; add swap on small droplets.
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 3800 ] && ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
  ok "2 GB swap added (server has ${MEM_MB} MB RAM)"
fi

ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
ok "Firewall: only SSH, HTTP and HTTPS are open"

# ------------------------------------------------------------------ deploy user + code
bold "2/8  Deploy user and code"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER" >/dev/null
fi
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
if [ -s /root/.ssh/authorized_keys ]; then
  # Let the same SSH key(s) log in as the deploy user.
  sort -u /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys" -o "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi
chown "$DEPLOY_USER:" "/home/$DEPLOY_USER/.ssh/authorized_keys" && chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"

# Both repositories are private: the server reads them with two read-only deploy keys
# (GitHub allows one repo per key). the bootstrap commands may already have made the website key.
SSH_DIR="/home/$DEPLOY_USER/.ssh"
for name in web backend; do
  key="$SSH_DIR/nexus_$name"
  if [ ! -f "$key" ]; then
    if [ "$name" = web ] && [ -f /root/.ssh/nexus_web ]; then
      install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /root/.ssh/nexus_web "$key"
      install -m 644 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /root/.ssh/nexus_web.pub "$key.pub"
    else
      sudo -u "$DEPLOY_USER" ssh-keygen -q -t ed25519 -N "" -C "nexus-server-$name" -f "$key"
    fi
  fi
done
cat >"$SSH_DIR/config" <<EOF
Host github-nexus-web
  HostName github.com
  User git
  IdentityFile $SSH_DIR/nexus_web
  IdentitiesOnly yes
Host github-nexus-backend
  HostName github.com
  User git
  IdentityFile $SSH_DIR/nexus_backend
  IdentitiesOnly yes
EOF
chown "$DEPLOY_USER:" "$SSH_DIR/config" && chmod 600 "$SSH_DIR/config"
ssh-keyscan -t ed25519 github.com 2>/dev/null >"$SSH_DIR/known_hosts.github"
sort -u "$SSH_DIR/known_hosts.github" "$SSH_DIR/known_hosts" 2>/dev/null -o "$SSH_DIR/known_hosts" || cp "$SSH_DIR/known_hosts.github" "$SSH_DIR/known_hosts"
rm -f "$SSH_DIR/known_hosts.github"
chown "$DEPLOY_USER:" "$SSH_DIR/known_hosts"

can_read() { sudo -u "$DEPLOY_USER" -H git ls-remote -q "$1" HEAD >/dev/null 2>&1; }
need_key() {
  local repo="$1" url="$2" pub="$3"
  while ! can_read "$url"; do
    echo
    warn "This server can't read $repo yet. Add its deploy key:"
    echo "    GitHub → $repo → Settings → Deploy keys → Add deploy key"
    echo "    Title: nexus-server   (leave \"Allow write access\" unticked)"
    echo "    Key:   $(cat "$pub")"
    read -r -p "  Press Enter once it is added... " _ </dev/tty
  done
}
need_key Kplgithub/Nexus "$REPO_URL" "$SSH_DIR/nexus_web.pub"
need_key Kplgithub/Nexus_Backend "$BACKEND_URL" "$SSH_DIR/nexus_backend.pub"
ok "GitHub access for both repositories (read-only)"

if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$DEPLOY_USER" -H git clone -q "$REPO_URL" "$APP_DIR"
else
  as_deploy "git remote set-url origin '$REPO_URL' && git fetch -q origin"
fi
if [ ! -d "$APP_DIR/backend/.git" ]; then
  sudo -u "$DEPLOY_USER" -H git clone -q "$BACKEND_URL" "$APP_DIR/backend"
else
  as_deploy "git -C backend remote set-url origin '$BACKEND_URL' && git -C backend fetch -q origin"
fi
chmod +x "$APP_DIR"/deploy/scripts/*.sh "$APP_DIR"/scripts/*.sh
ok "Website code in $APP_DIR, backend in $APP_DIR/backend (owned by $DEPLOY_USER)"

# ------------------------------------------------------------------ settings
bold "3/8  Settings (deploy/.env.production)"
if [ "$FRESH_ENV" = 1 ]; then
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  if [ "$USE_LOCAL_MONGO" = true ]; then
    MONGO_ROOT_PASSWORD="$(openssl rand -hex 24)"
    MONGODB_URI="mongodb://nexus:${MONGO_ROOT_PASSWORD}@mongo:27017/nexus?authSource=admin"
  fi
  umask 077
  cat >"$ENV_FILE" <<EOF
# Created by server-setup.sh on $(date -u +%F). Server only — never commit or share this file.
RELEASE=latest
NEXT_PUBLIC_SITE_URL=https://$DOMAIN
NEXT_PUBLIC_NOINDEX=false
REVALIDATE_SECONDS=60
IMAGE_HOSTS=

LOG_LEVEL=info
USE_LOCAL_MONGO=$USE_LOCAL_MONGO
MONGO_ROOT_USER=nexus
MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD:-}
MONGODB_URI=$MONGODB_URI
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
PUBLIC_SITE_URL=https://$DOMAIN
JWT_SECRET=$JWT_SECRET
SESSION_TTL_HOURS=12
USER_SESSION_TTL_DAYS=30
COOKIE_SECURE=true

# Mobile OTP: set SMS_DRIVER=msg91 and the two keys once your DLT template is approved,
# then run ./deploy/scripts/deploy.sh main main. Until then users sign in with email + password.
SMS_DRIVER=disabled
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=

UPLOAD_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=$CLD_NAME
CLOUDINARY_API_KEY=$CLD_KEY
CLOUDINARY_API_SECRET=$CLD_SECRET
CLOUDINARY_FOLDER=nexus-estate/properties

# Optional email (lead alerts, password-reset links)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM=

ENABLE_API_DOCS=false
PUBLIC_CACHE_SECONDS=60
EOF
  umask 022
  chown "$DEPLOY_USER:" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok "Written with a new random JWT secret$([ "$USE_LOCAL_MONGO" = true ] && echo ' and database password')"
else
  ok "Kept existing file"
fi

# ------------------------------------------------------------------ HTTPS
bold "4/8  Domain and HTTPS certificate"
SERVER_IP="$(curl -fsS4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
for host in "$DOMAIN" "www.$DOMAIN"; do
  got="$(dig +short A "$host" | tail -n1)"
  if [ "$got" != "$SERVER_IP" ]; then
    warn "$host points to '${got:-nothing}', not this server ($SERVER_IP)."
    echo "    Add an A record for $host → $SERVER_IP at your domain registrar, wait a few minutes, then re-run this script."
    die "DNS is not ready yet."
  fi
done
ok "DNS for $DOMAIN and www.$DOMAIN points here ($SERVER_IP)"

mkdir -p /var/www/certbot
rm -f /etc/nginx/sites-enabled/default
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  cat >/etc/nginx/sites-available/nexus-bootstrap.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'NEXUS Estate is being set up'; add_header Content-Type text/plain; }
}
EOF
  ln -sf /etc/nginx/sites-available/nexus-bootstrap.conf /etc/nginx/sites-enabled/nexus-bootstrap.conf
  nginx -t -q && systemctl reload nginx
  echo "  Requesting a free certificate from Let's Encrypt (you accept their terms: https://letsencrypt.org/repository/)"
  certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -d "www.$DOMAIN" \
    --email "$SSL_EMAIL" --agree-tos --no-eff-email -n
  rm -f /etc/nginx/sites-enabled/nexus-bootstrap.conf
fi
sed "s/example\.com/$DOMAIN/g" "$APP_DIR/deploy/nginx/nexus.conf" >/etc/nginx/sites-available/nexus.conf
ln -sf /etc/nginx/sites-available/nexus.conf /etc/nginx/sites-enabled/nexus.conf
nginx -t -q && systemctl reload nginx
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
ok "HTTPS certificate installed; renews automatically"

# ------------------------------------------------------------------ build + start
bold "5/8  Building and starting the site (first build takes 5–10 minutes)"
as_deploy "./deploy/scripts/deploy.sh main main"
ok "Site is running"

# ------------------------------------------------------------------ data
bold "6/8  Starting content and first admin"
as_deploy "./deploy/scripts/nexus.sh seed-base"
ok "FAQs and default settings"
if [[ "$SEED_LOCATIONS" =~ ^[Yy] ]]; then
  as_deploy "./deploy/scripts/nexus.sh seed-locations"
  ok "Jaipur and sample localities"
fi
if [ "$FRESH_ENV" = 1 ]; then
  echo "  Create your admin login (the password is typed here and stored only as a hash):"
  sudo -u "$DEPLOY_USER" -H bash -c "cd '$APP_DIR' && ./deploy/scripts/nexus.sh seed-admin" </dev/tty
  ok "Admin account created"
fi

# ------------------------------------------------------------------ backups
bold "7/8  Nightly backups"
CRON_LINE="15 2 * * * $APP_DIR/deploy/scripts/backup-mongo.sh >> /home/$DEPLOY_USER/nexus-backup.log 2>&1"
if [ "$(grep -E '^USE_LOCAL_MONGO=' "$ENV_FILE" | cut -d= -f2)" != true ] && ! command -v mongodump >/dev/null; then
  warn "Atlas selected: turn on Cloud Backup in Atlas (or install MongoDB Database Tools for the script)."
else
  (sudo -u "$DEPLOY_USER" crontab -l 2>/dev/null | grep -v backup-mongo.sh; echo "$CRON_LINE") | sudo -u "$DEPLOY_USER" crontab -
  ok "Database backup every night at 02:15, kept 14 days in $APP_DIR/deploy/backups"
  warn "Also copy backups off this server from time to time (e.g. DigitalOcean Spaces with rclone)."
fi

# ------------------------------------------------------------------ GitHub deploys
bold "8/8  Key for GitHub deploys"
KEY="/home/$DEPLOY_USER/.ssh/github_deploy"
if [ ! -f "$KEY" ]; then
  sudo -u "$DEPLOY_USER" ssh-keygen -q -t ed25519 -N "" -C "github-actions-deploy" -f "$KEY"
  cat "$KEY.pub" >>"/home/$DEPLOY_USER/.ssh/authorized_keys"
fi
ok "Created $KEY"

# Only disable password logins when someone can still log in with a key.
if [ -s /root/.ssh/authorized_keys ]; then
  printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' \
    >/etc/ssh/sshd_config.d/90-nexus-hardening.conf
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
  ok "SSH: password logins disabled (key logins only)"
else
  warn "No SSH key found for root, so password login was left on. Add a key, then re-run."
fi

# ------------------------------------------------------------------ checks
bold "Checking the live site"
sleep 3
curl -fsS "https://$DOMAIN/api/v1/health" | grep -q '"db":"up"' && ok "https://$DOMAIN/api/v1/health — database up" || warn "Health check did not return db up"
code="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/")"; [ "$code" = 200 ] && ok "Home page 200" || warn "Home page returned $code"
code="$(curl -s -o /dev/null -w '%{http_code}' "http://$DOMAIN/")"; [ "$code" = 301 ] && ok "HTTP redirects to HTTPS" || warn "HTTP returned $code"

cat <<EOF

$(printf '\033[1m')Done. Your site: https://$DOMAIN   Admin: https://$DOMAIN/admin$(printf '\033[0m')

Next, connect GitHub so updates deploy with one click. In BOTH repositories
(Kplgithub/Nexus and Kplgithub/Nexus_Backend):
  Settings → Secrets and variables → Actions → New repository secret
    DEPLOY_HOST     $SERVER_IP
    DEPLOY_USER     $DEPLOY_USER
    DEPLOY_PATH     $APP_DIR
    DEPLOY_SSH_KEY  the full output of:  cat $KEY
  Then Settings → Environments → New environment "production" → add yourself as a required reviewer.

Useful commands (as $DEPLOY_USER, in $APP_DIR):
  ./deploy/scripts/deploy.sh main main     update website + backend to the latest code
  ./deploy/scripts/nexus.sh logs -f api    live logs
  ./deploy/scripts/nexus.sh seed-admin     add another staff login
EOF
