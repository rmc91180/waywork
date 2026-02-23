import { getStripe } from "./stripe";

/**
 * Create a Stripe Connect Express account for a host.
 * Returns the account ID.
 */
export async function createConnectAccount(
  email: string,
  name?: string
): Promise<string> {
  const stripe = getStripe();

  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    ...(name ? { individual: { first_name: name.split(" ")[0], last_name: name.split(" ").slice(1).join(" ") || undefined } } : {}),
  });

  return account.id;
}

/**
 * Create an onboarding link for a Connect Express account.
 * After the user completes onboarding, they'll be redirected to the return URL.
 */
export async function createOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  const stripe = getStripe();

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return link.url;
}

/**
 * Create a login link for a connected account to access their Stripe dashboard.
 */
export async function createDashboardLink(
  accountId: string
): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

/**
 * Check if a connected account has completed onboarding.
 */
export async function isAccountOnboarded(
  accountId: string
): Promise<boolean> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  return account.charges_enabled && account.payouts_enabled;
}
