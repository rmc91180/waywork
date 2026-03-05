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
npm run db:push
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
- `npm run db:bootstrap` - start local Prisma dev DB, push schema, and seed data
- `npm run db:deploy` - push Prisma schema (safe for first deploys without migrations)
- `npm run db:seed` - seed demo data
- `npm run test:mews-contract` - fixture-backed Mews API contract checks
- `npm run test:smoke` - Playwright UI smoke tests
- `npm run pms:jobs` - process queued PMS sync jobs (retry/dead-letter pipeline)

## Railway deployment

### Required env vars

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST=true`
- `NEXT_PUBLIC_APP_URL`

### Optional env vars (feature flags/integrations)

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
- `MEWS_API_BASE_URL`
- `MEWS_CLIENT_TOKEN`
- `MEWS_CONNECTION_TOKEN`
- `MEWS_ACCESS_TOKEN`
- `MEWS_ENTERPRISE_ID`
- `MEWS_WEBHOOK_SECRET`
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
4. Run schema sync:
```bash
DATABASE_URL="$(railway run -s Postgres -- node -e "process.stdout.write(process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '')")" npm run db:deploy
```
5. (Optional) Seed demo data:
```bash
railway run npm run db:seed
```
6. If you create/update domain, set:
```bash
railway vars set AUTH_URL=https://<your-domain>
railway vars set NEXT_PUBLIC_APP_URL=https://<your-domain>
railway up --detach
```

You can also use the helper script:
```bash
bash scripts/deploy-railway.sh
```

## Mews Two-Way PMS Sync

WayWork includes a Mews channel manager integration foundation with:

- outbound booking sync queued with retry/dead-letter handling
- inbound ARI and reservation updates from Mews channel manager operations
- persistent sync state and event logging in Prisma (`PmsConnection`, `PmsSyncEvent`, `ListingDailyRate`)
- sync job queue persistence (`PmsSyncJob`) for robust retry processing
- host diagnostics (health score, queue stats, retry failed sync action)

Key API routes:

- `POST /api/pms/mews/connection` - configure/update host Mews credentials and listing mappings
- `GET /api/pms/mews/connection` - inspect current Mews connection and listing mapping status
- `POST /api/pms/mews/requestAriUpdate` - request ARI refresh from Mews
- `POST /api/pms/mews/retryFailed` - retry failed/dead-letter jobs for current host connection
- `POST /api/pms/mews/jobs/process` - cron endpoint to process queued jobs (`Authorization: Bearer <PMS_SYNC_CRON_SECRET>`)
- `POST /api/pms/mews/channel-manager/updateAvailability` - inbound availability updates from Mews
- `POST /api/pms/mews/channel-manager/updatePrices` - inbound price updates from Mews
- `POST /api/pms/mews/channel-manager/updateRestrictions` - inbound restrictions payload logging
- `POST /api/pms/mews/channel-manager/processGroup` - inbound reservation updates from Mews
