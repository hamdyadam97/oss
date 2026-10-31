#!/bin/sh
# First-time install on a Debian/Ubuntu server that already runs Nginx (and maybe other projects):
#   sudo sh deploy/install.sh [domain]          (default: pmpda.com)
# Run it from the project folder, e.g. /srv/pmpda. It only creates things named "pmpda":
# a system user, a PostgreSQL user + database, a systemd service and an Nginx site.
# Safe to re-run: existing .env (secrets), database and user are kept.
set -e
cd "$(dirname "$0")/.."
APP=$(pwd)
DOMAIN="${1:-pmpda.com}"
ENV_FILE="$APP/backend/.env"

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo: sudo sh deploy/install.sh $DOMAIN" >&2; exit 1; }

# --- 1. Requirements (reported, never installed behind your back) ---------------------------------
missing=""
python3 -c 'import sys; assert sys.version_info >= (3, 10)' 2>/dev/null || missing="$missing python3(>=3.10)"
python3 -c 'import venv, ensurepip' 2>/dev/null || missing="$missing python3-venv"
command -v psql >/dev/null || missing="$missing postgresql"
command -v nginx >/dev/null || missing="$missing nginx"
node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)' 2>/dev/null || missing="$missing nodejs(>=18)"
if [ -n "$missing" ]; then
  echo "Missing:$missing" >&2
  echo "Ubuntu: sudo apt install python3-venv postgresql nginx  (Node.js 20: https://deb.nodesource.com)" >&2
  exit 1
fi

# --- 2. System user that owns and runs the app ----------------------------------------------------
id pmpda >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin pmpda

# --- 3. Database + .env with fresh random secrets (only the first time) ---------------------------
if [ -f "$ENV_FILE" ]; then
  echo "backend/.env exists — keeping its secrets and database."
else
  DB_PASS=$(openssl rand -hex 24)
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='pmpda'" | grep -q 1; then
    sudo -u postgres psql -qc "ALTER ROLE pmpda WITH LOGIN PASSWORD '$DB_PASS';"
  else
    sudo -u postgres psql -qc "CREATE ROLE pmpda WITH LOGIN PASSWORD '$DB_PASS';"
  fi
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='pmpda'" | grep -q 1 \
    || sudo -u postgres psql -qc "CREATE DATABASE pmpda OWNER pmpda ENCODING 'UTF8';"

  # Hex secrets: nothing that needs escaping in a URL
  cat > "$ENV_FILE" <<EOF
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=$(openssl rand -hex 50)
FIELD_ENCRYPTION_KEY=$(openssl rand -base64 32 | tr '+/' '-_')
DATABASE_URL=postgres://pmpda:$DB_PASS@localhost:5432/pmpda
DJANGO_ALLOWED_HOSTS=$DOMAIN,www.$DOMAIN
DJANGO_CSRF_TRUSTED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
SITE_URL=https://$DOMAIN
DEMO_PASSWORD=Demo-$(openssl rand -hex 6)
EOF
  echo "Created backend/.env — BACK IT UP off the server: without FIELD_ENCRYPTION_KEY the encrypted national IDs cannot be read."
fi

# --- 4. Files and permissions ---------------------------------------------------------------------
mkdir -p "$APP/backend/media" "$APP/backend/private_media" "$APP/backups"
chown -R pmpda:pmpda "$APP"
chmod 600 "$ENV_FILE"
chmod 700 "$APP/backend/private_media" "$APP/backups"   # private attachments: the app only, never Nginx
chown -R pmpda:www-data "$APP/backend/media" && chmod 750 "$APP/backend/media"
chmod 755 "$APP"

# --- 5. Build backend + frontend (as the pmpda user) ----------------------------------------------
sh "$APP/deploy/update.sh" --no-restart

# --- 6. systemd service + Nginx site --------------------------------------------------------------
sed "s|__APP__|$APP|g" "$APP/deploy/pmpda.service" > /etc/systemd/system/pmpda.service
systemctl daemon-reload
systemctl enable --now pmpda
systemctl restart pmpda

SITE=/etc/nginx/sites-available/$DOMAIN
sed -e "s|__APP__|$APP|g" -e "s|pmpda\.com|$DOMAIN|g" "$APP/deploy/nginx-pmpda.conf" > "$SITE"
ln -sf "$SITE" /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

cat <<EOF

Installed. Remaining steps:
  1) HTTPS:            sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN
  2) Your admin user:  sudo -u pmpda $APP/backend/.venv/bin/python $APP/backend/manage.py createsuperuser
  3) Demo content (optional; demo_* accounts use DEMO_PASSWORD from backend/.env):
                       sudo -u pmpda $APP/backend/.venv/bin/python $APP/backend/manage.py seed_demo
  4) Daily backup:     sudo crontab -e   then add:   0 3 * * * sh $APP/deploy/backup.sh
EOF
