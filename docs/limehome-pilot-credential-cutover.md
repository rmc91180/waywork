# Limehome Pilot Credential Cutover

Last updated: 2026-03-29

## Goal

Everything before this step should already be complete. The only remaining work should be entering the real Limehome apaleo and Stripe values, then running the live cutover sequence once.

## Required Inputs

1. Environment credentials
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_CONNECT_WEBHOOK_SECRET`
   - `PMS_SYNC_CRON_SECRET`
   - `APALEO_REDIRECT_URI`
2. Limehome apaleo connection values
   - apaleo client ID
   - apaleo client secret
   - apaleo account code
   - apaleo webhook secret
   - apaleo refresh token
     - If a refresh token is not available, the host must complete the apaleo OAuth flow after the connection is prepared.
3. Host payout values
   - Limehome `stripeConnectAccountId`
   - optional custom booking commission percent

## Cutover Flow

1. Run the preflight view:
   - `npm run launch:preflight`
   - `/admin/pms/apaleo`
2. Confirm `Remaining Non-Credential Tasks` is empty.
3. In `/admin/pms/apaleo`, use `Credential Cutover` to:
   - save the real apaleo connection values
   - save the Limehome Stripe Connect account
   - save the booking commission split
4. If a refresh token is available, enable `Run live import, curation, subscription setup, and resync` and execute the cutover from the same screen.
5. If a refresh token is not available:
   - save the connection values first
   - complete apaleo OAuth
   - rerun the live cutover sequence from `/admin/pms/apaleo`

## Post-Cutover Verification

1. `npm run launch:healthcheck`
2. `npm run test:pilot-acceptance`
3. `/admin/pms/apaleo` shows:
   - no blockers
   - no remaining non-credential tasks
   - no missing credential inputs
4. `/admin/analytics` is recording traffic and pilot funnel events
5. Complete one real booking test and one cancel/resync test
