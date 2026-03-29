# Limehome Pilot Acceptance

Last updated: 2026-03-29

## Automated Check

Run this against the environment you plan to launch:

1. Ensure the app is up and connected to a real database.
2. Set `APP_URL` if the app is not on `http://localhost:3000`.
3. Run:
   - `npm run test:pilot-acceptance`

The script verifies:
- homepage renders
- Madrid search returns at least 5 Limehome Madrid listings
- each pilot listing detail page renders
- each pilot listing still has a booking CTA
- the Doctor Fleming page still exposes the team-stay CTA

## Manual QA Pass

1. Guest homepage
   - Madrid launch homes appear in the featured collection
   - the collection copy feels clear and work-focused
2. Search
   - `Madrid` search returns the full Limehome pilot inventory
   - listing cards show pilot context and stay fit clearly
3. Property pages
   - each listing clearly states who it is best for
   - internet, guest fit, cancellation, and price remain above the fold
4. Team-stay flow
   - Doctor Fleming exposes `Request multiple units`
   - the grouped inquiry dialog opens and can be sent
5. Booking path
   - `Reserve stay` remains visible
   - pricing and cancellation copy are still clean

## Launch Sign-Off

Approve launch only when:
- `npm run test:pilot-acceptance` passes in the target environment
- `/admin/pms/apaleo` shows no blockers
- `/admin/analytics` is loading and recording pilot traffic
- the Limehome Madrid collection is visible and merchandised as intended
