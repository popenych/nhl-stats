# Deploying to a VPS

Step-by-step walkthrough for a fresh Ubuntu VPS, accessed by **bare IP** (no domain —
Let's Encrypt can't certificate a bare IP, so this stays plain HTTP behind Caddy on port 80).
If you later buy a domain, see "Adding a domain later" at the bottom — it's a two-line change.

Sizing: 2 vCPU / 2GB RAM / 20GB disk minimum. PaddleOCR's models alone use 300-500MB RAM during
inference, and its Python deps push the backend image past 1.5GB — a 1GB/7GB box will fight OOM
kills and disk pressure constantly. If you're stuck on a smaller box anyway, at least add a 2GB
swap file (`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`).

## 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in (or `newgrp docker`) for this to take effect
```

This installs both the Docker Engine and the `docker compose` plugin.

## 2. Get the code onto the VPS

```bash
git clone git@github.com:popenych/nhl-stats.git
cd nhl-stats
```

(Use an HTTPS URL + a GitHub PAT instead if you haven't set up SSH keys on the VPS.)

## 3. Configure `.env`

```bash
cp .env.example .env
```

Fill in:
- `JWT_SECRET` — a long random string. Generate one with:
  ```bash
  openssl rand -hex 32
  ```
  This is the symmetric key that signs/verifies login session cookies — anyone with it can forge
  a valid session for any user, so treat it like a password. Rotating it later just logs everyone
  out (no data loss).
- `YANDEX_WEBDAV_USER` / `YANDEX_WEBDAV_APP_PASSWORD` — see step 5 (backups). Optional; the app
  runs fine without them, backups just won't push anywhere until they're set.

Leave `COOKIE_SECURE` unset (defaults to `false`) as long as you're on bare HTTP. If you add a
domain + HTTPS later (see bottom), set `COOKIE_SECURE=true` — otherwise the login cookie won't be
marked `Secure` even though it's served over TLS.

## 4. Caddy

`infra/Caddyfile` already defaults to plain `:80` with no domain, and `docker-compose.yml` only
maps host port 80 (not 443) — nothing to change for a bare-IP deployment. (Only edit either file
if you're adding a real domain later — see bottom.)

If `docker compose up` fails with `failed to bind host port 0.0.0.0:443/tcp: address already in
use` on an older checkout, pull the latest `docker-compose.yml` (443 was dropped from the port
mapping since bare-IP deploys never use it, and it was conflicting with an existing service —
e.g. a VPN — already bound to 443 on the host). Check what's holding a port with
`sudo ss -tlnp | grep :443`.

## 5. Backups (optional but recommended)

The `backup` sidecar pushes a SQLite snapshot + the photos directory to Yandex Disk via `rclone`,
once a day at a fixed time — `BACKUP_HOUR`/`BACKUP_MINUTE` in `.env`, **UTC**, default 03:00.
Convert from your local timezone yourself (e.g. 3am EEST/UTC+3 → `BACKUP_HOUR=0`). An admin can
also trigger one on demand from **Manage users → Run backup now** in the app; the backend touches
a shared trigger file the backup container polls every ~30s (see `infra/backup/run.sh`) — this
doesn't affect the daily schedule.

```bash
cp infra/rclone/rclone.conf.example infra/rclone/rclone.conf
```

Generate a Yandex **app password** (not your main account password) at
https://id.yandex.com/security/app-passwords, then fill in `infra/rclone/rclone.conf`'s `user`
and `pass` fields.

**The `pass` field must be rclone-"obscured", not plaintext** — a raw password gives
`couldn't decrypt password: input too short when revealing password - is it obscured?`. Obscure it
with:

```bash
docker compose exec -T backup rclone obscure - <<< "your-app-password"
```

and paste the output into `rclone.conf`'s `pass = ` line. (This is a reversible XOR-style
obfuscation, not real encryption — it just stops the password sitting in plaintext in a config
file, and it's the format rclone requires.)

**If you edit `rclone.conf` while the stack is already running**, restart the backup container so
it picks up the change — it caches the file in memory at startup and a bind-mount edit alone
won't be seen:

```bash
docker compose restart backup
```

Without a valid `rclone.conf`, the backup container logs a clear config error and retries the
next day rather than crash-looping — it's safe to skip this step and come back to it later.

## 6. Build and start

```bash
docker compose up -d --build
```

The backend container runs migrations and seeds the team list automatically on every start (both
idempotent). First backend startup downloads PaddleOCR's models (~tens of MB) into the
`paddle-models` volume — subsequent starts and restarts reuse them, no re-download.

The app is now reachable at `http://<vps-ip>`.

## 7. Create the first admin account

No self-registration by design — accounts are admin-created only.

```bash
docker compose exec backend python scripts/create_admin.py <username> <password> <player-name>
```

Log in at `http://<vps-ip>`, then create the rest of the group from **Manage users** in the app.

## 8. Test a restore, once

Don't just trust the backup script in theory — actually restore once to confirm it works, per
`infra/backup/restore.sh`:

```bash
docker compose stop backend
docker compose exec backup rclone lsf yandex:nhl-stats-backups/db/   # list available snapshots
docker compose exec backup ./restore.sh <snapshot-filename>
docker compose start backend
```

Then spot-check the app in the browser to confirm the data looks right.

## Common operations

| Task | Command |
|---|---|
| View logs | `docker compose logs -f -t backend` (or `frontend` / `caddy` / `backup`) — `-t` prefixes every line with when Docker received it, useful for correlating log lines with when something actually happened |
| Restart one service | `docker compose restart backend` |
| Pull + redeploy after a `git push` to `main` | `git pull && docker compose up -d --build` |
| Stop everything | `docker compose down` (keeps volumes — DB/photos survive) |
| Check disk usage | `docker system df` — `docker image prune` if build cache piles up |

## Adding a domain later

1. Point the domain's A record at the VPS's IP.
2. Replace `:80` at the top of `infra/Caddyfile` with the domain name — Caddy then handles HTTPS
   automatically (auto-provisions and renews a Let's Encrypt cert).
3. Add back the `"443:443"` port mapping under the `caddy` service in `docker-compose.yml` (it's
   commented out of the default bare-IP setup — see step 4 above).
4. Set `COOKIE_SECURE=true` in `.env`.
5. `docker compose up -d --build`.
