import Stripe from "stripe";

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
export const SERVICE_FEE_PERCENTAGE = 0.15;

export function calculatePricing(
  pricePerDay: number,
  numberOfDays: number,
  cleaningFee: number
) {
  const subtotal = pricePerDay * numberOfDays;
  const grossBookingAmount = subtotal + cleaningFee;
  const serviceFee = Math.round(grossBookingAmount * SERVICE_FEE_PERCENTAGE);
  const totalPrice = grossBookingAmount;
  const hostPayout = Math.max(0, grossBookingAmount - serviceFee);

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
