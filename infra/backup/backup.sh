#!/usr/bin/env bash
# Snapshots the SQLite DB + photos and pushes them to Yandex Disk via rclone.
# Run daily by run.sh's sleep loop (see that file for why it's not cron).
# Requires infra/rclone/rclone.conf to exist (gitignored — copy from
# rclone.conf.example and fill in your Yandex app password); if it's missing,
# rclone will fail loudly and run.sh will retry on the next daily tick.
set -euo pipefail

DB_PATH="${DB_PATH:-/data/db/nhl_stats.db}"
PHOTOS_DIR="${PHOTOS_DIR:-/data/photos}"
LOCAL_BACKUP_DIR="${BACKUP_LOCAL_DIR:-/data/backups}"
REMOTE="yandex:nhl-stats-backups"
RETENTION_LOCAL="${BACKUP_RETENTION_LOCAL:-14}"
RETENTION_REMOTE="${BACKUP_RETENTION_REMOTE:-30}"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
snapshot_path="${LOCAL_BACKUP_DIR}/nhl_stats_${timestamp}.db"

mkdir -p "${LOCAL_BACKUP_DIR}"

# Use SQLite's online backup API (safe under concurrent writers), not a raw cp.
sqlite3 "${DB_PATH}" ".backup '${snapshot_path}'"

rclone copy "${snapshot_path}" "${REMOTE}/db/"
rclone sync "${PHOTOS_DIR}" "${REMOTE}/photos/"

# Retention: prune anything older than the Nth-newest local/remote snapshot.
ls -1t "${LOCAL_BACKUP_DIR}"/nhl_stats_*.db | tail -n +$((RETENTION_LOCAL + 1)) | xargs -r rm --
rclone lsf "${REMOTE}/db/" | sort -r | tail -n +$((RETENTION_REMOTE + 1)) | \
  xargs -r -I{} rclone delete "${REMOTE}/db/{}"

echo "Backup complete: ${snapshot_path}"
