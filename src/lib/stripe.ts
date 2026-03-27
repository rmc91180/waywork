import Stripe from "stripe";
import {
  calculateBookingPricingFromGross,
  DEFAULT_BOOKING_COMMISSION_BPS,
  DEFAULT_BOOKING_COMMISSION_PERCENT,
} from "@/lib/payout-config";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// Way Work platform commission on booking gross (subtotal + cleaning fee)
export const SERVICE_FEE_PERCENTAGE = DEFAULT_BOOKING_COMMISSION_PERCENT / 100;
export const DEFAULT_SERVICE_FEE_BPS = DEFAULT_BOOKING_COMMISSION_BPS;

export function calculatePricing(
  pricePerDay: number,
  numberOfDays: number,
  cleaningFee: number,
  commissionBps = DEFAULT_BOOKING_COMMISSION_BPS
) {
  const subtotal = pricePerDay * numberOfDays;
  const grossBookingAmount = subtotal + cleaningFee;
  const { serviceFee, totalPrice, hostPayout } = calculateBookingPricingFromGross(
    grossBookingAmount,
    commissionBps
  );

  return {
    subtotal,
    cleaningFee,
    serviceFee,
    totalPrice,
    hostPayout,
  };
}

export function formatCurrency(amountInCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountInCents / 100);
}
