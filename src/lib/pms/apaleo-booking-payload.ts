type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonRecord = Record<string, JsonValue>;

export interface BookingRateSlice {
  date: string;
  amountCents: number;
}

export interface BookingPayloadInput {
  bookingId: string;
  propertyId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  currency: string;
  booker: {
    firstName: string;
    lastName: string;
    email: string;
  };
  primaryGuest: {
    firstName: string;
    lastName: string;
    email: string;
  };
  serviceFeeCents: number;
  totalPriceCents: number;
  specialRequests?: string | null;
  nightlySlices: BookingRateSlice[];
}

function amountToMoney(amountCents: number, currency: string) {
  return {
    amount: Number((amountCents / 100).toFixed(2)),
    currency,
  };
}

export function buildApaleoBookingPayload(input: BookingPayloadInput): JsonRecord {
  return {
    channelCode: "ChannelManager",
    source: "Other",
    comment: `WayWork booking ${input.bookingId}`,
    ...(input.specialRequests
      ? {
          bookerComment: input.specialRequests,
        }
      : {}),
    booker: {
      firstName: input.booker.firstName,
      lastName: input.booker.lastName,
      email: input.booker.email,
    },
    reservations: [
      {
        propertyId: input.propertyId,
        arrival: input.checkIn,
        departure: input.checkOut,
        adults: input.numberOfGuests,
        externalId: input.bookingId,
        ...(input.specialRequests
          ? {
              guestComment: input.specialRequests,
            }
          : {}),
        primaryGuest: {
          firstName: input.primaryGuest.firstName,
          lastName: input.primaryGuest.lastName,
          email: input.primaryGuest.email,
        },
        pricingType: "AfterTaxes",
        timeSlices: input.nightlySlices.map((slice) => ({
          ratePlanId: input.ratePlanId,
          totalAmount: amountToMoney(slice.amountCents, input.currency),
        })),
        commission: {
          commissionAmount: amountToMoney(input.serviceFeeCents, input.currency),
          beforeCommissionAmount: amountToMoney(input.totalPriceCents, input.currency),
        },
        externalReferences: {
          channelManagerId: input.bookingId,
        },
      },
    ],
  };
}
