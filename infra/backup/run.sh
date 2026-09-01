#!/usr/bin/env bash
# Runs backup.sh once, then every 24h, forever. A plain loop instead of a
# cron daemon — running a cron daemon as PID 1 in a container hits
# `setpgid: Operation not permitted` on some container runtimes (dcron/busybox
# crond fork jobs and try to move them to a new process group, which PID 1
# isn't allowed to do in that context). A loop needs no such privilege and is
# simpler for a single daily job.
#
# Polls a trigger file every POLL_INTERVAL seconds instead of one long sleep,
# so a manually-requested backup (the backend touches this file — see
# app/api/routes/backup.py) runs within POLL_INTERVAL seconds rather than
# waiting for the next scheduled run.
set -euo pipefail

TRIGGER_FILE="${BACKUP_TRIGGER_FILE:-/data/backup-trigger/run}"
POLL_INTERVAL=30
SCHEDULE_INTERVAL=86400

last_run=0
while true; do
  now=$(date +%s)
  if [ -f "$TRIGGER_FILE" ]; then
    rm -f "$TRIGGER_FILE"
    echo "Manual backup triggered at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    /usr/local/bin/backup.sh || echo "Backup failed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    last_run=$now
  elif [ $((now - last_run)) -ge $SCHEDULE_INTERVAL ]; then
    /usr/local/bin/backup.sh || echo "Backup failed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    last_run=$now
  fi
  sleep $POLL_INTERVAL
done
