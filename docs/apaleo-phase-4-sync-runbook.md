# apaleo Phase 4 Sync Runbook

This runbook covers the Phase 4 sync layer for the Limehome Madrid pilot.

## Scope

- Inbound ARI updates from apaleo
- Inbound reservation webhooks from apaleo
- Subscription registration for Madrid property mappings
- Full resync recovery flow using fixture-backed payloads until live credentials are available

## Admin Operations

- Register subscriptions:
  - `POST /api/admin/pms/apaleo/setup-subscriptions`
  - body: `{ "hostEmail": "partner@example.com", "useFixtures": true }`
- Run full resync:
  - `POST /api/admin/pms/apaleo/full-resync`
  - body: `{ "hostEmail": "partner@example.com", "useFixtures": true }`

## Inbound Endpoints

- ARI:
  - `POST /api/pms/apaleo/ari?token=<webhook-secret>`
- Reservation webhooks:
  - `POST /api/pms/apaleo/webhooks?token=<webhook-secret>`

Both endpoints also accept `x-apaleo-webhook-secret`.

## Current Recovery Model

- ARI subscriptions are stored on the `PmsConnection` record.
- Reservation changes are replayed into Way Work booking records.
- Full resync replays fixture ARI snapshot and reservation payloads through the same handlers used by live inbound traffic.

## Health Expectations

- `PMS_ACTIVE_PROVIDER=APALEO` is treated as a database-backed PMS mode.
- `/api/health/pms` now reports apaleo queue and connection health using the shared PMS health checks.
