"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  bookingCommissionBpsToPercent,
  bookingCommissionPercentToBps,
} from "@/lib/payout-config";
import {
  createConnectAccount,
  createOnboardingLink,
  createDashboardLink,
  isAccountOnboarded,
} from "@/lib/stripe-connect";

/**
 * Start Stripe Connect onboarding for the current host.
 * Creates a Connect account if needed, then redirects to Stripe.
 */
export async function startConnectOnboarding() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true, email: true, name: true },
  });

  if (!user) throw new Error("User not found");

  let accountId = user.stripeConnectAccountId;

  // Create account if not exists
  if (!accountId) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe is not configured. Contact support.");
    }

    accountId = await createConnectAccount(user.email, user.name || undefined);

    await db.user.update({
      where: { id: session.user.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const onboardingUrl = await createOnboardingLink(
    accountId,
    `${baseUrl}/host/payouts?onboarding=complete`,
    `${baseUrl}/host/payouts?onboarding=refresh`
  );

  redirect(onboardingUrl);
}

/**
 * Get the Stripe dashboard link for a connected account.
 */
export async function getStripeDashboardLink() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    throw new Error("No Stripe account connected");
  }

  const url = await createDashboardLink(user.stripeConnectAccountId);
  redirect(url);
}

/**
 * Check the current user's Stripe Connect status.
 */
export async function getConnectStatus(): Promise<{
  hasAccount: boolean;
  isOnboarded: boolean;
  accountId: string | null;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { hasAccount: false, isOnboarded: false, accountId: null };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    return { hasAccount: false, isOnboarded: false, accountId: null };
  }

  let onboarded = false;
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      onboarded = await isAccountOnboarded(user.stripeConnectAccountId);
    } catch {
      // Account may not exist in Stripe anymore
    }
  }

  return {
    hasAccount: true,
    isOnboarded: onboarded,
    accountId: user.stripeConnectAccountId,
  };
}

export async function getPayoutSettings(): Promise<{
  stripeConnectAccountId: string | null;
  defaultBookingCommissionBps: number;
  defaultBookingCommissionPercent: number;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      stripeConnectAccountId: true,
      defaultBookingCommissionBps: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    stripeConnectAccountId: user.stripeConnectAccountId,
    defaultBookingCommissionBps: user.defaultBookingCommissionBps,
    defaultBookingCommissionPercent: bookingCommissionBpsToPercent(
      user.defaultBookingCommissionBps
    ),
  };
}

export async function updateDefaultBookingCommissionPercent(percent: number) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const commissionBps = bookingCommissionPercentToBps(percent);
  if (commissionBps === null) {
    throw new Error("A valid commission percentage is required.");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      defaultBookingCommissionBps: commissionBps,
    },
  });

  return {
    ok: true,
    defaultBookingCommissionBps: commissionBps,
    defaultBookingCommissionPercent: bookingCommissionBpsToPercent(commissionBps),
  };
}
