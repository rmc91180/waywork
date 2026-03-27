import { strict as assert } from "node:assert";
import {
  bookingCommissionBpsToPercent,
  bookingCommissionPercentToBps,
  calculateBookingPricingFromGross,
  resolveBookingCommissionBps,
} from "@/lib/payout-config";

async function run() {
  const hostDefault = bookingCommissionPercentToBps(12.5);
  const partnerOverride = bookingCommissionPercentToBps(18.25);

  assert.equal(hostDefault, 1250);
  assert.equal(partnerOverride, 1825);
  assert.equal(bookingCommissionBpsToPercent(1825), 18.25);
  assert.equal(
    resolveBookingCommissionBps({
      hostDefaultBookingCommissionBps: hostDefault,
      connectionBookingCommissionBps: partnerOverride,
    }),
    1825
  );

  const pricing = calculateBookingPricingFromGross(20000, 1825);
  assert.equal(pricing.serviceFee, 3650);
  assert.equal(pricing.hostPayout, 16350);
  assert.equal(pricing.totalPrice, 20000);

  console.log("[payout-config] PASS");
  console.log("[payout-config] Verified host default and partner override commission resolution.");
}

run().catch((error) => {
  console.error("[payout-config] FAIL", error);
  process.exit(1);
});
