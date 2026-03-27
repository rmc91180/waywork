# apaleo Phase 5 Booking Runbook

This runbook covers the booking path for apaleo-managed listings.

## Scope

- Way Work creates a pending booking and holds local inventory.
- Stripe authorizes the card using manual capture for apaleo listings.
- Stripe destination-charge settings route the host payout to the connected account and retain the Way Work commission automatically.
- Way Work creates the reservation in apaleo.
- Way Work captures the Stripe authorization only after apaleo accepts the booking.
- On failure, Way Work cancels the payment hold and releases the pending inventory.

## Flow

1. `POST /api/bookings/checkout`
2. Stripe Checkout Session is created with `payment_intent_data.capture_method=manual` for apaleo listings
3. `POST /api/webhooks/stripe`
4. apaleo booking is created through the Distribution API
5. Stripe `PaymentIntent` is captured
6. Way Work marks the booking `CONFIRMED`

## Stripe Requirements

- The listing host must have a valid `stripeConnectAccountId`.
- Way Work commission is applied in code via `application_fee_amount`.
- Host payout is routed automatically by Stripe using `transfer_data.destination`.
- For apaleo listings, payout only settles after the manual capture succeeds.
- Commission resolution order:
  - `PmsConnection.bookingCommissionBps` override when present
  - otherwise `User.defaultBookingCommissionBps`
  - otherwise the platform default

## Failure Handling

- If apaleo rejects the booking, Way Work cancels the Stripe authorization and releases blocked dates.
- If Stripe capture fails after apaleo accepted the booking, Way Work attempts an apaleo cancellation and releases blocked dates.
- Refund-driven cancellations continue through the shared PMS sync job queue.
