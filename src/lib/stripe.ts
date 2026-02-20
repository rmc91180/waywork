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

// Service fee percentage charged to guests
export const SERVICE_FEE_PERCENTAGE = 0.12;

export function calculatePricing(
  pricePerDay: number,
  numberOfDays: number,
  cleaningFee: number
) {
  const subtotal = pricePerDay * numberOfDays;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
  const totalPrice = subtotal + cleaningFee + serviceFee;
  // Host receives subtotal + cleaning fee (Stripe processing fees deducted by Stripe)
  const hostPayout = subtotal + cleaningFee;

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
