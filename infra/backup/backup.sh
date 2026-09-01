#!/usr/bin/env bash
# Snapshots the SQLite DB + photos and pushes them to Yandex Disk via rclone.
# Scheduled by run.sh's loop (see that file for why it's not cron).
# Requires infra/rclone/rclone.conf to exist (gitignored — copy from
# rclone.conf.example and fill in your Yandex app password); if it's missing,
# rclone will fail loudly and run.sh will retry on the next scheduled tick.
set -euo pipefail

DB_PATH="${DB_PATH:-/data/db/nhl_stats.db}"
PHOTOS_DIR="${PHOTOS_DIR:-/data/photos}"
LOCAL_BACKUP_DIR="${BACKUP_LOCAL_DIR:-/data/backups}"
REMOTE="yandex:nhl-stats-backups"
RETENTION_LOCAL="${BACKUP_RETENTION_LOCAL:-14}"
RETENTION_REMOTE="${BACKUP_RETENTION_REMOTE:-30}"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
snapshot_name="nhl_stats_${timestamp}.db"
snapshot_path="${LOCAL_BACKUP_DIR}/${snapshot_name}"

mkdir -p "${LOCAL_BACKUP_DIR}"

# Use SQLite's online backup API (safe under concurrent writers), not a raw cp.
log "Snapshotting ${DB_PATH} -> ${snapshot_path}"
sqlite3 "${DB_PATH}" ".backup '${snapshot_path}'"

# Some WebDAV servers (Yandex Disk included, apparently) don't implicitly
# create missing destination directories on copy/sync the way most rclone
# backends do — mkdir is idempotent (a no-op if the directory already
# exists), so it's safe to run unconditionally every time.
log "Ensuring remote directories exist"
rclone mkdir "${REMOTE}/db/"
rclone mkdir "${REMOTE}/photos/"

log "Uploading DB snapshot to ${REMOTE}/db/"
rclone copy "${snapshot_path}" "${REMOTE}/db/" -v

log "Syncing photos to ${REMOTE}/photos/"
rclone sync "${PHOTOS_DIR}" "${REMOTE}/photos/" -v

# Confirm the snapshot actually landed remotely rather than trusting rclone's
# exit code alone — a misconfigured/stale remote can exit 0 without the file
# actually being there, which a plain "Backup complete" log line would hide.
if rclone lsf "${REMOTE}/db/" | grep -qx "${snapshot_name}"; then
  log "Verified ${snapshot_name} is present on the remote"
else
  log "WARNING: ${snapshot_name} not found on the remote after upload"
fi

# Retention: prune anything older than the Nth-newest local/remote snapshot.
ls -1t "${LOCAL_BACKUP_DIR}"/nhl_stats_*.db | tail -n +$((RETENTION_LOCAL + 1)) | xargs -r rm --
rclone lsf "${REMOTE}/db/" | sort -r | tail -n +$((RETENTION_REMOTE + 1)) | \
  xargs -r -I{} rclone delete "${REMOTE}/db/{}"

log "Backup complete: ${snapshot_path}"
