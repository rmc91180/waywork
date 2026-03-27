# Apaleo Madrid Pilot Execution Board

Last updated: 2026-03-27

## Phase Status

| Phase | Theme | Status | Delivery Notes |
|---|---|---|---|
| 0 | Architecture and readiness baseline | Completed | `APALEO` provider reserved, env/config baseline, Phase 0 readiness doc |
| 1 | Provider foundation and OAuth scaffolding | Completed | `PmsProvider.APALEO`, Prisma connection fields, fixture-backed apaleo client, connect/callback/connection routes |
| 2 | Madrid inventory import | Completed | idempotent Madrid importer, admin import endpoint, import runbook |
| 3 | Content enrichment and work-fit curation | Completed | Madrid curation service, admin curation endpoint, curation-aware moderation flow |
| 4 | Availability, rate, reservation sync | Completed | ARI ingestion, reservation webhooks, subscription registration, full resync, shared health support |
| 5 | Checkout, payment, and booking creation | Completed | direct apaleo reservation flow, Stripe manual capture for apaleo, configurable host/partner commission splits |
| 6 | Pilot QA, operations, and launch controls | Completed | apaleo readiness summary, `/admin/pms/apaleo`, pilot ops panel, pilot smoke script, launch runbook |

## Definition of Green

- `npm run lint` passes.
- `npm run build` passes.
- `npm run test:apaleo-contract` passes.
- `npm run test:apaleo-madrid-import` passes.
- `npm run test:apaleo-madrid-curation` passes.
- `npm run test:apaleo-sync` passes.
- `npm run test:apaleo-booking` passes.
- `npm run test:payout-config` passes.
- `npm run test:apaleo-pilot` passes.
- `/api/health/pms` returns `ok=true` in `APALEO` mode.
- `/admin/pms/apaleo` shows no blockers for the launch inventory.

## Remaining External Dependencies

- Limehome production apaleo credentials and account code.
- Final Madrid property list and rate-plan confirmation from Limehome.
- Final agreed payout split for Limehome, then Stripe Connect account ID on the host user.
- Partner-side operational signoff for webhook endpoints and booking exception handling.
