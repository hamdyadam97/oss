#!/bin/sh
# Deploy new code:  sudo sh deploy/update.sh
# (after git pull or copying the new files into the project folder). Also used by install.sh.
set -e
cd "$(dirname "$0")/.."
APP=$(pwd)

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo: sudo sh deploy/update.sh" >&2; exit 1; }
chown -R pmpda:pmpda "$APP/backend" "$APP/frontend" "$APP/branding"
# Uploads made through the site are group-readable only (umask 007): keep the group Nginx runs as
chown -R pmpda:www-data "$APP/backend/media"

as_app() { sudo -u pmpda -H sh -c "$1"; }

# Backend: dependencies, database changes, static files, official content (fills only what is empty)
as_app "cd '$APP/backend' && { [ -d .venv ] || python3 -m venv .venv; } \
  && .venv/bin/pip install --quiet --upgrade pip \
  && .venv/bin/pip install --quiet -r requirements.txt \
  && .venv/bin/python manage.py migrate --noinput \
  && .venv/bin/python manage.py collectstatic --noinput --verbosity 0 \
  && .venv/bin/python manage.py init_site"

# Frontend: production build into frontend/dist (served directly by Nginx)
as_app "cd '$APP/frontend' && npm ci --no-audit --no-fund --loglevel=error && npm run build"

if [ "$1" != "--no-restart" ]; then
  systemctl restart pmpda
  echo "Updated and restarted."
fi
