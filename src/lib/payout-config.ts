export const DEFAULT_BOOKING_COMMISSION_BPS = 1500;
export const DEFAULT_BOOKING_COMMISSION_PERCENT = DEFAULT_BOOKING_COMMISSION_BPS / 100;

export function clampBookingCommissionBps(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return DEFAULT_BOOKING_COMMISSION_BPS;
  }

  return Math.min(10_000, Math.max(0, Math.round(value as number)));
}

export function bookingCommissionBpsToPercent(value: number | null | undefined) {
  return clampBookingCommissionBps(value) / 100;
}

export function bookingCommissionPercentToBps(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return clampBookingCommissionBps(Math.round(value * 100));
}

export function resolveBookingCommissionBps(input: {
  hostDefaultBookingCommissionBps?: number | null;
  connectionBookingCommissionBps?: number | null;
}) {
  return clampBookingCommissionBps(
    input.connectionBookingCommissionBps ?? input.hostDefaultBookingCommissionBps
  );
}

export function calculateBookingPricingFromGross(
  grossBookingAmount: number,
  commissionBps = DEFAULT_BOOKING_COMMISSION_BPS
) {
  const normalizedGross = Math.max(0, Math.round(grossBookingAmount));
  const normalizedBps = clampBookingCommissionBps(commissionBps);
  const serviceFee = Math.round((normalizedGross * normalizedBps) / 10_000);
  const totalPrice = normalizedGross;
  const hostPayout = Math.max(0, totalPrice - serviceFee);

  return {
    commissionBps: normalizedBps,
    commissionPercent: normalizedBps / 100,
    subtotalPlusCleaningFee: normalizedGross,
    serviceFee,
    totalPrice,
    hostPayout,
  };
}
