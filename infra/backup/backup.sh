#!/usr/bin/env bash
# Phase 5: snapshot the SQLite DB + photos and push to Yandex Disk via rclone.
# Not wired into docker-compose or run automatically yet — see the plan's
# Backups section for the intended design (daily cron + debounced on-write
# trigger, 14 local / 30 remote retention).
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
