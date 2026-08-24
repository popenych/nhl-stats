# Phase 5: small sidecar that snapshots the DB/photos to Yandex Disk on a
# schedule (see docker-compose.yml — mounts the DB/photos volumes read-only).
FROM alpine:3.20

RUN apk add --no-cache bash sqlite rclone dcron

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Daily at 03:00 UTC, per the plan's recommended cadence.
RUN echo "0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

CMD ["crond", "-f", "-d", "8"]
