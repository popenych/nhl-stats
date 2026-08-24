# Phase 5: small sidecar that snapshots the DB/photos to Yandex Disk on a
# schedule (see docker-compose.yml — mounts the DB/photos volumes read-only).
FROM alpine:3.20

RUN apk add --no-cache bash sqlite rclone

COPY backup.sh /usr/local/bin/backup.sh
COPY run.sh /usr/local/bin/run.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/run.sh

CMD ["/usr/local/bin/run.sh"]
