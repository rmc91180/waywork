# Apaleo Launch Runbook

Last updated: 2026-03-27

## 1. Pre-Cutover (T-7 to T-1 days)

1. Confirm platform baseline:
   - `PMS_ACTIVE_PROVIDER=APALEO`
   - `DATABASE_URL` and `DIRECT_DATABASE_URL` are set
   - Stripe is configured and the host has a `stripeConnectAccountId`
2. Confirm Limehome apaleo connection state:
   - `apaleoClientId`
   - `apaleoClientSecret`
   - `apaleoRefreshToken`
   - `apaleoAccountCode`
   - `apaleoWebhookSecret`
3. Run the pilot build gates:
   - `npm run lint`
   - `npm run build`
   - `npm run test:apaleo-contract`
   - `npm run test:apaleo-madrid-import`
   - `npm run test:apaleo-madrid-curation`
   - `npm run test:apaleo-sync`
   - `npm run test:apaleo-booking`
   - `npm run test:payout-config`
   - `npm run test:apaleo-preflight`
   - `npm run test:apaleo-pilot`
   - `npm run test:pilot-merchandising`
4. Run the preflight gate:
   - `npm run launch:preflight`
   - `/admin/pms/apaleo` should show no remaining non-credential tasks before live credential entry
5. In `/admin/pms/apaleo`, run the internal launch sequence:
   - Import Madrid inventory
   - Curate Madrid inventory
   - Register subscriptions
   - Run full resync
6. Review `/admin/listings` and approve only the Madrid listings that are both:
   - `PUBLISHABLE`
   - operationally ready for direct booking

## 2. Cutover Day Checklist

1. Deploy current release.
2. Apply database migrations:
   - `npm run db:deploy`
   - `npm run db:prepare`
3. Verify health:
   - `npm run launch:preflight`
   - `npm run launch:healthcheck`
   - `GET /api/health/db` returns `ok=true`
   - `GET /api/health/pms` returns `ok=true`
   - `/admin/pms/apaleo` shows no blockers
   - `/admin/pms/apaleo` shows no remaining non-credential tasks
4. Confirm apaleo subscription state:
   - reservation webhook subscription is present
   - ARI subscription state is present for every Madrid property
5. Confirm guest-facing merchandising:
   - homepage shows the Madrid launch collection
   - `/search?query=madrid` shows the full Limehome set
   - `npm run test:pilot-acceptance` passes against the deployed app
6. Confirm direct-booking readiness:
   - at least one active Madrid listing has live price and availability
   - the host Stripe Connect account is configured
   - booking capture happens only after apaleo reservation creation succeeds

## 3. Post-Cutover (First 24h)

1. Watch `/api/health/pms` every 15 minutes:
   - `failed`
   - `deadLetter`
   - `stale`
   - `provider.readiness`
2. Watch `/admin/pms/apaleo` every 15 minutes:
   - launch blockers
   - inbound failures over 24h
   - outbound failures over 24h
   - active listings missing Stripe Connect
3. Confirm the first live booking cycle:
   - Stripe authorization created
   - apaleo reservation created
   - Stripe payment captured
   - `stripeTransferId` stored
   - booking record marked synced

## 4. Rollback Plan

1. Set `PMS_ACTIVE_PROVIDER=NONE` to stop PMS processing safely.
2. Pause or unlist active Madrid apaleo inventory if booking accuracy is in doubt.
3. Fix the root cause, then recover in this order:
   - re-enable `PMS_ACTIVE_PROVIDER=APALEO`
   - rerun subscription setup if required
   - run full resync
   - re-open listings only after `/admin/pms/apaleo` is clear of blockers
4. If data integrity is at risk, restore from DB backup/PITR using the incident timestamp.
