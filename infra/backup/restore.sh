#!/usr/bin/env bash
# Phase 5 restore runbook. Usage: restore.sh <snapshot-filename>
# List available snapshots with: rclone lsf yandex:nhl-stats-backups/db/
set -euo pipefail

SNAPSHOT_NAME="${1:?Usage: restore.sh <snapshot-filename>}"
DB_PATH="${DB_PATH:-/data/db/nhl_stats.db}"
REMOTE="yandex:nhl-stats-backups"

echo "1. Stop the backend container before restoring (docker compose stop backend)."
echo "2. Downloading ${SNAPSHOT_NAME}..."
rclone copy "${REMOTE}/db/${SNAPSHOT_NAME}" /tmp/restore/

echo "3. Clearing stale WAL/SHM files and replacing the live DB..."
rm -f "${DB_PATH}-wal" "${DB_PATH}-shm"
cp "/tmp/restore/${SNAPSHOT_NAME}" "${DB_PATH}"

echo "4. Restart the backend, then sanity-check: alembic current, and spot-check the UI."
