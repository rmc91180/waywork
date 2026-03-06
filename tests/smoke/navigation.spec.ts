import { expect, test } from "@playwright/test";

test("home navigation and host CTA links are functional", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Work Wonders Worldwide/i })).toBeVisible();

  const invalidHrefs = await page.$$eval("a", (anchors) =>
    anchors
      .map((anchor) => ({ href: anchor.getAttribute("href"), text: anchor.textContent?.trim() || "" }))
      .filter((item) => item.href === "" || item.href === "#")
  );

  expect(invalidHrefs).toEqual([]);

  await page.getByRole("link", { name: /Host Sign Up/i }).click();
  await expect(page).toHaveURL(/\/register\?callbackUrl=%2Fhost/);

  await page.goto("/");
  await page.getByRole("link", { name: /Host Login/i }).click();
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhost/);

  await page.goto("/");
  await page.getByRole("link", { name: /Search spaces/i }).first().click();
  await expect(page).toHaveURL(/#quick-search$/);
});

test("host routes redirect unauthenticated users to login cleanly", async ({ page }) => {
  await page.goto("/host");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhost/);
  await expect(page.getByText("Welcome back")).toBeVisible();

  const hasDemoButton = (await page.getByRole("button", { name: /Sign in as Demo User/i }).count()) > 0;
  const hasEmailField = (await page.getByLabel(/Email/i).count()) > 0;
  const hasUnavailableMessage =
    (await page.getByText(/Email sign-in is currently unavailable/i).count()) > 0;
  const hasLoadingState =
    (await page.getByText(/Loading sign-in methods/i).count()) > 0;
  expect(hasDemoButton || hasEmailField || hasUnavailableMessage || hasLoadingState).toBeTruthy();

  await page.goto("/host/listings");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhost/);
});

test("host auth callback links preserve host redirect path", async ({ page }) => {
  await page.goto("/login?callbackUrl=%2Fhost");
  await page.getByRole("link", { name: /^Sign up$/i }).click();
  await expect(page).toHaveURL(/\/register\?callbackUrl=%2Fhost/);

  await page.getByRole("link", { name: /^Log in$/i }).click();
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhost/);
});

test("authenticated host navigation screens load without application errors", async ({ page }) => {
  await page.goto("/login?callbackUrl=%2Fhost");

  const demoButton = page.getByRole("button", { name: /Sign in as Demo User/i });
  const hasDemoButton = (await demoButton.count()) > 0;
  test.skip(!hasDemoButton, "Demo credentials login is unavailable in this environment.");

  await demoButton.click();
  await page.waitForURL(/\/host/, { timeout: 30_000 });

  const hostScreens: Array<{ label: string; href: RegExp }> = [
    { label: "Dashboard", href: /\/host$/ },
    { label: "Listings", href: /\/host\/listings$/ },
    { label: "Bookings", href: /\/host\/bookings$/ },
    { label: "Calendar", href: /\/host\/calendar$/ },
    { label: "Channel Manager", href: /\/host\/channel-manager$/ },
    { label: "Earnings", href: /\/host\/earnings$/ },
    { label: "Payouts", href: /\/host\/payouts$/ },
  ];

  for (const screen of hostScreens) {
    await page.getByRole("link", { name: screen.label }).first().click();
    await expect(page).toHaveURL(screen.href);
    await expect(page.getByText(/Application error: a server-side exception/i)).toHaveCount(0);
  }

  await page.getByRole("link", { name: /Listings/i }).first().click();
  await page.getByRole("link", { name: /New Listing|Create Your First Listing/i }).first().click();
  await expect(page).toHaveURL(/\/host\/listings\/new$/);
  await expect(page.getByText(/Application error: a server-side exception/i)).toHaveCount(0);
});
