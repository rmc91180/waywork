# SiteMinder Launch Runbook

Last updated: 2026-03-06

## 1. Pre-Cutover (T-7 to T-1 days)

1. Confirm infra baseline:
   - `DATABASE_URL` + `DIRECT_DATABASE_URL` configured.
   - automated DB backups + PITR enabled.
   - `PMS_ACTIVE_PROVIDER=SITEMINDER`.
2. Confirm SiteMinder credentials in Way Work:
   - `SITEMINDER_API_BASE_URL`
   - `SITEMINDER_CLIENT_ID`
   - `SITEMINDER_CLIENT_SECRET`
   - `SITEMINDER_PROPERTY_ID`
   - `SITEMINDER_WEBHOOK_SECRET` (recommended)
3. Map host listings on `/host/channel-manager`:
   - each live listing has `pmsExternalListingId`
   - each live listing has `pmsExternalRatePlanId` where applicable.
4. Run quality gates:
   - `npm run lint`
   - `npm run build`
   - `npm run test:smoke`
   - `npm run siteminder:sandbox`

## 2. Cutover Day Checklist

1. Deploy current release.
2. Run DB migration + prepare:
   - `npm run db:deploy`
   - `npm run db:prepare`
3. Verify health:
   - `npm run launch:healthcheck`
   - `GET /api/health/db` returns `ok=true`
   - `GET /api/health/pms` returns `ok=true`
4. Verify cron processors:
   - GitHub workflow `PMS Jobs Cron` is green.
   - `POST /api/pms/siteminder/jobs/process` returns `200` with non-error payload.
5. Verify webhook ingress URLs with SiteMinder:
   - `POST /api/pms/siteminder/channel-manager/processGroup`
   - `POST /api/pms/siteminder/channel-manager/updateAvailability`
   - `POST /api/pms/siteminder/channel-manager/updatePrices`

## 3. Post-Cutover (First 24h)

1. Watch sync health every 15 minutes:
   - `failed`, `deadLetter`, and `stale` in `/api/health/pms`.
2. Confirm first live booking cycle:
   - outbound event written (`SITEMINDER_RES_UPLOAD_*`).
   - inbound reservation/availability/rate updates applied.
   - booking status and blocked dates reflect expected values.
3. Escalate immediately if:
   - any `deadLetter > 0`
   - `stale > 0` for > 15 minutes
   - repeated `401`/`500` on SiteMinder webhook routes.

## 4. Rollback Plan

1. Set `PMS_ACTIVE_PROVIDER=NONE` to stop all PMS queue processing safely.
2. Keep host booking flow active (direct Way Work inventory) while investigating.
3. Replay failed jobs after fix:
   - resolve root cause
   - re-enable `PMS_ACTIVE_PROVIDER=SITEMINDER`
   - trigger `POST /api/pms/siteminder/jobs/process`
4. If needed, restore database from snapshot/PITR using incident timestamp.
