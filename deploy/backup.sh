#!/bin/sh
# Backup of the database and both upload folders into backups/ (keeps 14 days). Run as root:
#   sudo sh deploy/backup.sh          — or daily from root's crontab: 0 3 * * * sh /srv/pmpda/deploy/backup.sh
# Copy backups/ (and backend/.env) off the server regularly.
set -e
cd "$(dirname "$0")/.."

STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p backups && chmod 700 backups

sudo -u postgres pg_dump --clean pmpda | gzip > "backups/db_$STAMP.sql.gz"
tar czf "backups/files_$STAMP.tar.gz" -C backend media private_media
chmod 600 backups/*_"$STAMP".*

find backups -name '*.gz' -mtime +14 -delete
echo "$STAMP backup ok"
