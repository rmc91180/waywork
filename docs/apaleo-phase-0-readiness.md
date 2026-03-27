# apaleo Phase 0 Readiness

Last updated: 2026-03-27

## Objective

Define the implementation baseline for onboarding Limehome's live Madrid inventory through apaleo before we have partner credentials. This phase locks pilot scope, source-of-truth rules, required schema changes, environment requirements, and the build backlog for Phase 1.

## Pilot Scope

- Market: Madrid only.
- Inventory type: apartments and homes only.
- Use case: single-person work stays and small-group offsite accommodation.
- Booking path: Way Work checkout and payment, direct reservation creation in apaleo.
- Partner access: no Limehome apaleo credentials yet; all connector work must be buildable and testable against fixtures.

## Key Assumptions

- All Limehome Madrid properties are live and should be considered in scope for import.
- apaleo is the operational source of truth for properties, unit groups, rate plans, availability, rates, and reservation state.
- Way Work remains the source of truth for work-suitability merchandising, payment state, editorial content, and publish decisions.
- Limehome can provide additional booking and content details later, but the first implementation pass must not depend on those details being available.

## Current Architecture Findings

### Existing strengths

- Provider mode switching already exists in `src/lib/pms/provider-mode.ts`.
- Environment validation already centralizes PMS env vars in `src/lib/env.ts`.
- PMS jobs and events already exist in `prisma/schema.prisma`.
- Listing sync fields already support external listing and rate plan identifiers.
- Health checks and queue processing already exist for PMS operations.

### Current gaps for apaleo

- Provider routing is still optimized around MEWS and SiteMinder only.
- `PmsConnection` is provider-specific and does not yet support OAuth token lifecycle storage.
- Listing mapping only stores one external listing id and one rate plan id; Limehome Madrid onboarding needs property-level and unit-group-level mapping.
- Host UI and connection routes are SiteMinder-labeled and manual-entry oriented.
- Queue processing assumes only two booking sync adapters and treats ARI requests as MEWS-only.

## Source-of-Truth Matrix

| Concern | Source of truth | Notes |
|---|---|---|
| Properties and unit groups | apaleo | Import from apaleo, not from limehome.com |
| Rate plans | apaleo | Only mapped sellable rate plans should be used |
| Availability and nightly rates | apaleo | Keep in sync via ARI subscriptions |
| Reservation state | apaleo | Reservation id returned by apaleo is canonical |
| Payment authorization/capture | Way Work | Payment succeeds only after apaleo booking succeeds |
| Listing copy, images, work-fit metadata | Way Work + Limehome enrichment | PMS data alone will not be enough |
| Publish decision | Way Work | Based on work score and editorial review |

## Required Data Model Changes

### Provider-level changes

- Add `APALEO` to:
  - `PMS_ACTIVE_PROVIDER` handling
  - env validation enums
  - Prisma `PmsProvider`

### `PmsConnection` additions

- apaleo API base URL
- apaleo identity base URL
- apaleo OAuth client id
- apaleo OAuth client secret
- encrypted refresh token
- access token expiry timestamp
- account code
- webhook subscription metadata
- ARI subscription metadata
- optional last successful token refresh timestamp

### Listing mapping additions

- `pmsExternalPropertyId`
- `pmsExternalUnitGroupId`
- continue using `pmsExternalRatePlanId`

These identifiers should be treated as opaque values. apaleo rate plan ids must not be parsed for meaning.

## Environment Baseline

The following env surface is now reserved for apaleo work:

- `APALEO_API_BASE_URL`
- `APALEO_IDENTITY_BASE_URL`
- `APALEO_CLIENT_ID`
- `APALEO_CLIENT_SECRET`
- `APALEO_ACCOUNT_CODE`
- `APALEO_REDIRECT_URI`
- `APALEO_WEBHOOK_SECRET`

Even before we have real credentials, local and CI environments should support placeholder values so fixture-backed connector work can start immediately.

## Phase 0 Decisions

### Decision 1: Build apaleo as a first-class provider

We will add apaleo to the shared PMS runtime rather than creating a Limehome-only importer. This preserves reuse for future partners on apaleo.

### Decision 2: Build against fixtures first

Phase 1 must be fully executable without Limehome credentials. We will create realistic fixture payloads for:

- properties
- unit groups
- rate plans
- ARI full and delta pushes
- reservation webhook events
- booking create success and failure responses

### Decision 3: Keep pilot inventory at unit-group granularity

We will import individual sellable units or unit groups first. We will not implement bundled multi-unit offsite inventory in the initial booking flow.

### Decision 4: Keep group offsite handling narrow

The pilot will support solo and small-group accommodation, but not meeting-venue inventory. Listings that require bundled multi-unit selling or meeting-space promises stay out of automated launch scope.

### Decision 5: Preserve Way Work payment ownership

Checkout remains on Way Work. Booking orchestration order will be:

1. validate live price and availability with apaleo
2. authorize payment in Way Work
3. create reservation in apaleo
4. capture payment only after reservation creation succeeds

## Risks and Mitigations

- apaleo content gap
  - Mitigation: separate operational import from editorial enrichment and publish review.
- provider-specific code duplication
  - Mitigation: use this phase to identify routing and queue abstractions before adding a third provider.
- missing Limehome credentials
  - Mitigation: build against fixtures and reserve all required env/schema surfaces now.
- multi-property Madrid complexity
  - Mitigation: add property-level mapping in the schema instead of relying on one property id per connection.
- payment/reservation drift
  - Mitigation: treat apaleo booking success as the prerequisite for payment capture.

## Phase 1 Build Backlog

1. Extend Prisma `PmsProvider` and `PmsConnection` for apaleo.
2. Add listing external ids for property and unit group mapping.
3. Add apaleo client with OAuth, token refresh, property fetch, unit group fetch, rate plan fetch, ARI subscription management, webhook subscription management, and booking creation/cancellation.
4. Add fixture-backed contract tests for the apaleo client.
5. Add provider-aware routing helpers so queue processing and health logic are not hard-coded to two providers.
6. Add initial apaleo connection routes and callback flow.
7. Add an internal Madrid import service that can run from fixtures first.

## Definition of Done for Phase 0

- Pilot scope is explicit and limited.
- Source-of-truth responsibilities are documented.
- Required schema and env changes are defined.
- The repo reserves the basic provider/env surface for apaleo.
- Phase 1 backlog is specific enough to implement without reopening architectural questions.
