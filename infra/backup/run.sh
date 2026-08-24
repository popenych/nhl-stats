#!/usr/bin/env bash
# Runs backup.sh once, then sleeps a day, forever. A plain loop instead of a
# cron daemon — running a cron daemon as PID 1 in a container hits
# `setpgid: Operation not permitted` on some container runtimes (dcron/busybox
# crond fork jobs and try to move them to a new process group, which PID 1
# isn't allowed to do in that context). A loop needs no such privilege and is
# simpler for a single daily job.
set -euo pipefail

while true; do
  /usr/local/bin/backup.sh || echo "Backup failed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  sleep 86400
done
