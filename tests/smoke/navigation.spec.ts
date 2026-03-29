import { expect, test, type Page } from "@playwright/test";

async function expectNoBrokenAnchors(page: Page) {
  const invalidHrefs = await page.locator("a[href]").evaluateAll((anchors) =>
    anchors
      .map((anchor) => ({
        href: anchor.getAttribute("href"),
        text: anchor.textContent?.trim() || "",
        className:
          typeof anchor.className === "string"
            ? anchor.className
            : anchor.getAttribute("class") || "",
      }))
      .filter((item) => {
        const isLeafletZoomControl =
          item.href === "#" && item.className.includes("leaflet-control-zoom");
        return !isLeafletZoomControl && (item.href === "" || item.href === "#");
      })
  );

  expect(invalidHrefs).toEqual([]);
}

async function signInAsDemoHost(page: Page) {
  await page.goto("/login?callbackUrl=%2Fhost");
  await expect(page.getByText(/Welcome back/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in as Demo User/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /Sign in as Demo User/i }).click();
  await page.waitForURL(/\/host/, { timeout: 30_000 });
  await expect(page.getByText(/Host workspace/i)).toBeVisible();
}

async function signInAsDemoUser(page: Page, callbackUrl: string, destinationPattern: RegExp) {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await expect(page.getByText(/Welcome back/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in as Demo User/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /Sign in as Demo User/i }).click();
  await page.waitForURL(destinationPattern, { timeout: 30_000 });
}

test("homepage CTAs and quick search are functional", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Find beautiful homes that actually work for work/i })
  ).toBeVisible();

  await expectNoBrokenAnchors(page);

  await page.getByRole("link", { name: /Explore spaces/i }).click();
  await expect(page).toHaveURL(/\/search$/);

  await page.goto("/");
  await page.getByLabel(/Destination, landmark, or team hub/i).fill("Madrid");
  await page.getByLabel(/Check-in date/i).fill("2026-04-01");
  await page.getByLabel(/Check-out date/i).fill("2026-04-04");
  await page.getByLabel(/Number of guests/i).selectOption("2");
  await page.getByRole("button", { name: /^Search$/i }).click();

  await expect(page).toHaveURL(/\/search\?/);
  await expect(page.getByText(/spaces near Madrid|results for "madrid"/i)).toBeVisible();
  await expect(page.getByText(/Limehome Madrid/i).first()).toBeVisible();
});

test("search calendars, filters, map mode, and property links work", async ({ page }) => {
  await page.goto("/search?query=madrid");
  await expect(page.getByText(/results for "madrid"/i)).toBeVisible();
  await expect(page.getByText(/Limehome Madrid Quevedo Work Loft/i)).toBeVisible();
  await expectNoBrokenAnchors(page);

  await page.getByRole("button", { name: /Add dates/i }).first().click();
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  await page.locator('[data-slot="calendar"] [data-day="4/1/2026"]').click();
  await expect(page.locator('[data-slot="calendar"]')).toHaveCount(0);

  await page.getByRole("button", { name: /Add dates/i }).click();
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  await page.locator('[data-slot="calendar"] [data-day="4/4/2026"]').click();
  await expect(page.locator('[data-slot="calendar"]')).toHaveCount(0);

  await page.getByRole("button", { name: /^Search$/i }).click();
  await expect(page).toHaveURL(/checkIn=2026-04-01/);
  await expect(page).toHaveURL(/checkOut=2026-04-04/);

  await page.getByRole("button", { name: /^Filters\b/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#guests-search-filters").fill("6");
  await page.getByRole("button", { name: /Show .*workspace/i }).click();

  await expect(page).toHaveURL(/guests=6/);
  await expect(page.getByText(/Doctor Fleming Team Apartment/i)).toBeVisible();

  await page.getByRole("button", { name: /Map View/i }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();

  await page.getByRole("button", { name: /^Grid$/i }).click();
  await page.locator('a[href^="/spaces/"]:visible').first().click();

  await expect(page).toHaveURL(/\/spaces\//);
  await expect(page.getByRole("button", { name: /Reserve stay/i })).toBeVisible();
  await expect(page.getByLabel(/Check-in/i)).toBeVisible();
  await expect(page.getByLabel(/Check-out/i)).toBeVisible();
  await expect(page.getByText(/Way Work commission/i)).toHaveCount(0);
});

test("team-stay planner supports grouped inquiries for Madrid portfolio units", async ({ page }) => {
  await signInAsDemoUser(page, "/search?query=madrid", /\/search\?query=madrid/);

  await expect(page.getByText(/results for "madrid"/i)).toBeVisible();
  await page
    .locator('a[href^="/spaces/"]')
    .filter({ hasText: /Limehome Madrid Doctor Fleming Team Apartment/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/spaces\//);
  await expect(
    page.getByText(/Bundle multiple units in one building|Pair this stay with more Madrid Limehome units/i)
  ).toBeVisible();

  await page.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: /Request multiple units/i }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel(/Expected team size/i).fill("8 teammates");
  await page.getByLabel(/Notes for the host/i).fill(
    "We'd like to keep the team close together and coordinate arrivals."
  );
  await page.getByRole("button", { name: /Send team stay request/i }).click();

  await page.waitForURL(/\/messages\//, { timeout: 30_000 });
  await expect(page.getByText(/multi-unit team stay/i).first()).toBeVisible();
  await expect(page.getByText(/Additional units requested:/i).first()).toBeVisible();
});

test("host login and primary workspace routes load cleanly", async ({ page }) => {
  await page.goto("/host");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhost/);

  await signInAsDemoHost(page);

  const nav = page.locator("nav").first();
  const hostScreens: Array<{ label: string; href: RegExp; heading: RegExp }> = [
    { label: "Home", href: /\/host$/, heading: /Welcome back/i },
    { label: "Listings", href: /\/host\/listings$/, heading: /Listings/i },
    { label: "Bookings", href: /\/host\/bookings$/, heading: /Bookings/i },
    { label: "Calendar", href: /\/host\/calendar$/, heading: /Calendar/i },
    { label: "PMS", href: /\/host\/channel-manager$/, heading: /PMS|Property Management/i },
    { label: "Earnings", href: /\/host\/earnings$/, heading: /Earnings/i },
    { label: "Payouts", href: /\/host\/payouts$/, heading: /Payouts/i },
  ];

  for (const screen of hostScreens) {
    await nav.getByRole("link", { name: screen.label }).click();
    await expect(page).toHaveURL(screen.href);
    await expect(page.getByText(screen.heading).first()).toBeVisible();
    await expect(page.getByText(/Application error: a server-side exception/i)).toHaveCount(0);
  }
});
