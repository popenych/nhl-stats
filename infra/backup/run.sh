#!/usr/bin/env bash
# Runs backup.sh once a day at a fixed time (BACKUP_HOUR:BACKUP_MINUTE, UTC —
# default 03:00), forever. A plain poll loop instead of a cron daemon —
# running a cron daemon as PID 1 in a container hits `setpgid: Operation not
# permitted` on some container runtimes (dcron/busybox crond fork jobs and
# try to move them to a new process group, which PID 1 isn't allowed to do in
# that context). Polling avoids that privilege entirely and is simple enough
# for a single daily job.
#
# Also polls a trigger file every POLL_INTERVAL seconds — a manually
# requested backup (the backend touches this file; see
# app/api/routes/backup.py) runs within POLL_INTERVAL seconds instead of
# waiting for the next scheduled time, and doesn't affect the daily schedule.
set -euo pipefail

TRIGGER_FILE="${BACKUP_TRIGGER_FILE:-/data/backup-trigger/run}"
POLL_INTERVAL=30
BACKUP_HOUR="${BACKUP_HOUR:-3}"      # 0-23, UTC
BACKUP_MINUTE="${BACKUP_MINUTE:-0}"  # 0-59, UTC

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

run_backup() {
  /usr/local/bin/backup.sh || log "Backup failed"
}

last_run_date=""

while true; do
  if [ -f "$TRIGGER_FILE" ]; then
    rm -f "$TRIGGER_FILE"
    log "Manual backup triggered"
    run_backup
  else
    today=$(date -u +%Y-%m-%d)
    # Base-10 forced (10#...) so a leading zero like "08" isn't misread as
    # an invalid octal literal by shell arithmetic.
    current_minutes=$((10#$(date -u +%H) * 60 + 10#$(date -u +%M)))
    target_minutes=$((BACKUP_HOUR * 60 + BACKUP_MINUTE))
    if [ "$current_minutes" -ge "$target_minutes" ] && [ "$today" != "$last_run_date" ]; then
      log "Scheduled backup starting (target ${BACKUP_HOUR}:$(printf '%02d' "$BACKUP_MINUTE") UTC)"
      run_backup
      last_run_date="$today"
    fi
  fi
  sleep "$POLL_INTERVAL"
done
