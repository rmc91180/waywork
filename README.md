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
4. Start the app:
```bash
npm run dev
```

## Scripts

- `npm run dev` - local development
- `npm run build` - production build
- `npm run start` - production server
- `npm run lint` - eslint
- `npm run db:deploy` - push Prisma schema (safe for first deploys without migrations)
- `npm run db:seed` - seed demo data

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
