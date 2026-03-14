# Railway Deploy

## Steps

1. Deploy this repository from GitHub to Railway.
2. Add one persistent volume and mount it at `/data`.
3. Railway will set `RAILWAY_VOLUME_MOUNT_PATH=/data` for the service.
4. Generate a public domain for the app in Railway.
5. Start command stays the same: `npm start`.

## How Persistence Works

- The Express app keeps static files in `/public` inside the app source.
- On Railway, app data is stored under the mounted volume:
  - `/data/data/store.json`
  - `/data/uploads/`
- Locally, if no persistence env var is set, the app behaves as before and uses the project root:
  - `./data/store.json`
  - `./uploads/`

## Optional Future Postgres

- Postgres is not used by the app yet.
- You can keep the Railway Postgres service attached for a future migration.
- When ready, the provided `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` variables can be wired in later.
