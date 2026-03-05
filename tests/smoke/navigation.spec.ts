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
  expect(hasDemoButton || hasEmailField).toBeTruthy();

  await page.goto("/host/listings");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhost/);
});
