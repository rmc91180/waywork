# WayWork

WayWork is a Next.js 16 + Prisma app for workspace listings, bookings, and host payouts.

## Local setup

1. Install dependencies:
```bash
npm ci
```
2. Copy env file and set values:
```bash
cp .env.example .env
```
3. Push schema and seed demo data (optional):
```bash
npm run db:deploy
npm run db:seed
```
Or run one command to start local Prisma Postgres + push schema + seed:
```bash
npm run db:bootstrap
```
4. Start the app:
```bash
npm run dev
```

## Scripts

- `npm run dev` - local development
- `npm run build` - production build
- `npm run start` - production server
- `npm run lint` - eslint
- `npm run db:prepare` - DB preflight (retries + migrate deploy + critical table verification)
- `npm run db:check` - DB connectivity/critical table verification without running migrations
- `npm run db:bootstrap` - start local Prisma dev DB, push schema, and seed data
- `npm run db:deploy` - run Prisma migrations (`prisma migrate deploy`)
- `npm run db:baseline:existing` - baseline an already-existing schema to migration `20260305190000_init`
- `npm run db:seed` - seed demo data
- `npm run siteminder:sandbox` - create a full local sandbox booking cycle with SiteMinder-ready mappings
- `npm run test:mews-contract` - fixture-backed Mews API contract checks
- `npm run test:smoke` - Playwright UI smoke tests
- `npm run pms:jobs` - process queued PMS sync jobs (retry/dead-letter pipeline)
- `npm run launch:healthcheck` - launch readiness check against DB + PMS health endpoints

## Railway deployment

### Required env vars

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST=true`
- `NEXT_PUBLIC_APP_URL`

### Optional env vars (feature flags/integrations)

- `DIRECT_DATABASE_URL` (recommended when using a pooled `DATABASE_URL`; used for migrations)
- `DB_MIGRATION_FALLBACK_PUSH` (`true` by default, set `false` after migration history is baselined)
- `DB_STARTUP_MAX_RETRIES` (default `20`)
- `DB_STARTUP_RETRY_DELAY_MS` (default `3000`)
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXT_PUBLIC_HAS_GOOGLE_AUTH` (`true` or `false`)
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `PMS_ACTIVE_PROVIDER` (`SITEMINDER` default, supports `MEWS` and `NONE`)
- `MEWS_API_BASE_URL`
- `MEWS_CLIENT_TOKEN`
- `MEWS_CONNECTION_TOKEN`
- `MEWS_ACCESS_TOKEN`
- `MEWS_ENTERPRISE_ID`
- `MEWS_WEBHOOK_SECRET`
- `SITEMINDER_API_BASE_URL`
- `SITEMINDER_CLIENT_ID`
- `SITEMINDER_CLIENT_SECRET`
- `SITEMINDER_PROPERTY_ID`
- `SITEMINDER_WEBHOOK_SECRET`
- `PMS_SYNC_CRON_SECRET`
- `SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE`

### Deploy flow

1. Create Railway project and attach PostgreSQL.
2. Set required env vars.
3. Deploy app:
```bash
railway up --detach
```
4. Run migrations:
```bash
DATABASE_URL="$(railway run -s Postgres -- node -e "process.stdout.write(process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '')")" npm run db:deploy
```
5. If your DB was previously created by `db push`, baseline migration history once:
```bash
DATABASE_URL="$(railway run -s Postgres -- node -e "process.stdout.write(process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '')")" npm run db:baseline:existing
```
6. (Optional) Seed demo data:
```bash
railway run npm run db:seed
```
7. If you create/update domain, set:
```bash
railway vars set AUTH_URL=https://<your-domain>
railway vars set NEXT_PUBLIC_APP_URL=https://<your-domain>
railway up --detach
```

You can also use the helper script:
```bash
bash scripts/deploy-railway.sh
```

## Launch DB Reliability Checklist

1. Enable automated Postgres backups + point-in-time recovery on your provider.
2. Use pooled `DATABASE_URL` for app traffic and set `DIRECT_DATABASE_URL` for migrations.
3. Keep `DB_MIGRATION_FALLBACK_PUSH=true` only during transition; set to `false` after baseline.
4. Monitor `GET /api/health/db` and alert on non-200 responses.
5. Monitor `GET /api/health/pms` and alert on non-200 responses.
6. Schedule `POST /api/pms/siteminder/jobs/process` with `PMS_SYNC_CRON_SECRET` so booking/listing sync jobs do not stall.
7. Before each release: run `npm run db:check`, `npm run build`, and smoke tests.

## SiteMinder OTA Sync Rollout

WayWork now targets SiteMinder as the active channel manager integration path:

- host credential + mapping management on `/host/channel-manager`
- `PMS_ACTIVE_PROVIDER` guardrails to explicitly disable legacy MEWS endpoints
- persistent sync state and event logging in Prisma (`PmsConnection`, `PmsSyncEvent`, `ListingDailyRate`)
- sync job queue persistence (`PmsSyncJob`) for robust retry processing
- sandbox booking-cycle script (`npm run siteminder:sandbox`)

Key API routes:

- `POST /api/pms/siteminder/connection` - configure/update host SiteMinder credentials and listing mappings
- `GET /api/pms/siteminder/connection` - inspect current SiteMinder connection and listing mapping status
- `POST /api/pms/siteminder/jobs/process` - process pending SiteMinder PMS sync jobs
- `POST /api/pms/siteminder/channel-manager/processGroup` - inbound reservation updates from SiteMinder
- `POST /api/pms/siteminder/channel-manager/updateAvailability` - inbound availability updates from SiteMinder
- `POST /api/pms/siteminder/channel-manager/updatePrices` - inbound rate updates from SiteMinder
- `GET /api/health/pms` - PMS queue and connection health status
- `POST /api/pms/mews/*` - returns HTTP `410` when `PMS_ACTIVE_PROVIDER` is not `MEWS`
