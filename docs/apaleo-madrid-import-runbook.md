# apaleo Madrid Import Runbook

Last updated: 2026-03-27

## Purpose

This runbook describes the Phase 2 Madrid inventory import flow for Limehome. The importer creates or updates draft Way Work listings from apaleo-backed Madrid inventory and preserves the result in a repeatable, idempotent way.

## Current Import Path

- Service: `src/lib/pms/apaleo-import.ts`
- Admin trigger route: `POST /api/admin/pms/apaleo/import-madrid`
- Fixture contract test: `npm run test:apaleo-madrid-import`

## Request Payload

```json
{
  "hostEmail": "partners+limehome@waywork.com",
  "hostName": "Limehome",
  "accountCode": "LIMEHOME-MADRID",
  "useFixtures": true
}
```

## Behavior

- Upserts a host user by email and ensures the user has role `HOST`.
- Upserts an `APALEO` `PmsConnection` for that host.
- Loads the apaleo property catalog from fixtures for now.
- Filters to `city = Madrid`.
- Builds one candidate listing per unit group plus sellable rate plan.
- Creates or updates draft `Listing` records with:
  - apaleo property id
  - apaleo unit group id
  - apaleo rate plan id
  - title, address, city, state, country
  - price, currency, occupancy, workspace type
  - connectivity profile when available
  - starter amenities when available
- Recomputes `workScore` after import.

## Idempotency Rules

- Existing listings are matched by:
  - host
  - `pmsConnectionId`
  - `pmsExternalPropertyId`
  - `pmsExternalUnitGroupId`
  - `pmsExternalRatePlanId`
- Re-import updates operational fields and mapping data.
- Manual enrichment is preserved where possible:
  - existing custom descriptions are not overwritten
  - verified connectivity is not overwritten
  - existing amenities are only replaced when the listing has none

## Current Limitations

- The importer is fixture-backed until Limehome apaleo credentials are available.
- Imported listings are drafts, not auto-published listings.
- Images are not imported yet.
- Bundled multi-unit group inventory is not implemented yet.

## Validation

- `npm run test:apaleo-contract`
- `npm run test:apaleo-madrid-import`
- `npm run build`
- `npm run lint`
