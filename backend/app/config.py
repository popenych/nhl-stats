from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./data/db/nhl_stats.db"
    jwt_secret: str = "dev-secret-change-me-in-production-please-thanks"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30
    photo_storage_dir: str = "./data/photos"
    # A file the backend touches and the backup sidecar polls for (see
    # infra/backup/run.sh) — the two containers share nothing else, so this
    # is how "run a backup now" gets from the API to that container without
    # giving the backend a Docker socket or duplicating rclone/backup logic
    # into it.
    backup_trigger_path: str = "./data/backup-trigger/run"
    cors_origins: str = "http://localhost:5173"
    # False for local dev (plain http); set true in prod .env once served over
    # https behind Caddy, so auth cookies get the Secure flag.
    cookie_secure: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
