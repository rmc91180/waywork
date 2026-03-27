# apaleo Madrid Curation Runbook

Last updated: 2026-03-27

## Purpose

This runbook describes the Phase 3 enrichment and curation pass for imported Limehome Madrid inventory.

## Current Curation Path

- Service: `src/lib/pms/apaleo-curation.ts`
- Admin trigger route: `POST /api/admin/pms/apaleo/curate-madrid`
- Contract test: `npm run test:apaleo-madrid-curation`

## Request Payload

```json
{
  "hostEmail": "partners+limehome@waywork.com",
  "useFixtures": true
}
```

## Behavior

- Loads imported Madrid listings connected to `APALEO`.
- Applies fixture-backed editorial enrichment:
  - longer descriptions
  - starter image gallery
  - additional work-focused amenities
- Recomputes `workScore`.
- Classifies each listing into one of:
  - `PUBLISHABLE`
  - `NEEDS_REVIEW`
  - `REJECTED`
- Updates listing lifecycle state accordingly:
  - `PUBLISHABLE` -> `PENDING_REVIEW`
  - `NEEDS_REVIEW` -> `DRAFT`
  - `REJECTED` -> `REJECTED`
- Writes notes into `curationNotes` and rejection reasons when applicable.

## Publishability Rules

A listing is rejected when it is outside Madrid scope, lacks kitchen support, lacks required PMS mapping, or is not apartment/home-style enough for the pilot.

A listing needs review when it is in scope but still lacks merchandising completeness, such as:

- fewer than 3 images
- weak description
- too few amenities
- missing desk/quiet evidence
- low work score
- weak download speed

A listing becomes publishable when those checks pass and it is ready for admin moderation.

## Validation

- `npm run test:apaleo-contract`
- `npm run test:apaleo-madrid-import`
- `npm run test:apaleo-madrid-curation`
- `npm run build`
- `npm run lint`
