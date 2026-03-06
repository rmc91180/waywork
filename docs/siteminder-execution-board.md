# SiteMinder Launch Execution Board

Last updated: 2026-03-06

## Week-by-Week Delivery

| Week | Theme | Status | Delivery Notes |
|---|---|---|---|
| 1 | PMS migration guardrails + host UX stabilization | Completed | `PMS_ACTIVE_PROVIDER`, SiteMinder host page, MEWS endpoint decommission responses, host nav and dashboard updates |
| 2 | Data model extension for SiteMinder credentials/mapping | Completed | `PmsProvider.SITEMINDER`, SiteMinder credential fields, migration `20260306120000_add_siteminder_support` |
| 3 | Host onboarding acceleration | Completed | Airbnb URL import endpoint + wizard prefill + dashboard import card |
| 4 | Payment economics hardening | Completed | 15% Way Work commission model, host payout net remittance logic, pricing UI alignment |
| 5 | Legal and policy baseline | Completed | Expanded guest/host terms and privacy policy with UK/London governance language |
| 6 | Channel manager jobs foundation | Completed | SiteMinder cron endpoint scaffold + workflow reroute |
| 7 | Sandbox smoke coverage | Completed | `npm run siteminder:sandbox` booking cycle script |
| 8 | Host route reliability hardening | Completed | New host channel manager route, smoke navigation coverage updates |
| 9 | Visual QA and homepage spacing tuning | Completed | Hero/quick-search spacing improvements |
| 10 | Regression controls | Completed | Lint + build + smoke suite run against updated stack |
| 11 | SiteMinder reservation export adapter | Completed | SOAP client + WSSE headers + outbound booking upsert/cancel sync + queue processing wired |
| 12 | SiteMinder inbound availability/rate/reservation adapter | Completed | SOAP verification + reservation/availability/rate normalization + DB write handlers + inbound routes |
| 13 | Production readiness and launch controls | Completed | `/api/health/pms`, launch healthcheck script, production health workflow extension, launch runbook |

## Execution Risks (Open)

- SiteMinder production API credentials and final payload certification are still required for go-live traffic.
- Legal texts are strong baseline copy but still require final external counsel approval before public launch.
- Existing legacy MEWS code paths still exist in repository for rollback/testing, but are runtime-disabled unless explicitly re-enabled.

## Definition of Green for Current Slice

- `npm run lint` passes.
- `npm run build` passes.
- `npm run test:smoke` passes (host authenticated nav test skips when demo sign-in is unavailable).
