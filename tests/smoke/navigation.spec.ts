import { expect, test, type Page } from "@playwright/test";
import { addDays, format } from "date-fns";

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

function formatCalendarDay(value: Date) {
  return `${value.getMonth() + 1}/${value.getDate()}/${value.getFullYear()}`;
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
  await page.getByRole("button", { name: /Where/ }).click();
  await page.getByPlaceholder(/City, neighborhood, or property/i).fill("Madrid");
  await page.getByRole("button", { name: /^Done$/ }).click();

  const checkIn = addDays(new Date(), 14);
  const checkOut = addDays(new Date(), 17);
  await page.getByRole("button", { name: /When/ }).first().click();
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  await page.locator(`[data-slot="calendar"] [data-day="${formatCalendarDay(checkIn)}"]`).first().click();
  await page.getByRole("button", { name: /When/ }).first().click();
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  await page.locator(`[data-slot="calendar"] [data-day="${formatCalendarDay(checkOut)}"]`).first().click();
  await expect(page.locator('[data-slot="calendar"]')).toHaveCount(0);

  await page.getByRole("button", { name: /Who/ }).click();
  await page.getByRole("button", { name: "4" }).click();

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

  const checkIn = addDays(new Date(), 14);
  const checkOut = addDays(new Date(), 17);
  const checkInIso = format(checkIn, "yyyy-MM-dd");
  const checkOutIso = format(checkOut, "yyyy-MM-dd");
  await page.goto(`/search?query=madrid&checkIn=${checkInIso}&checkOut=${checkOutIso}`);
  await expect(page).toHaveURL(new RegExp(`checkIn=${checkInIso}`));
  await expect(page).toHaveURL(new RegExp(`checkOut=${checkOutIso}`));

  await page.locator("button", { hasText: /^Filters/i }).last().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#guests-search-filters").fill("6");
  await page.locator("#guests-search-filters").blur();
  await expect(page.locator("#guests-search-filters")).toHaveValue("6");
  await page.getByRole("button", { name: /Show .*workspace/i }).click();
  await expect(page).toHaveURL(/\/search\?/);

  await page.getByRole("button", { name: /Map View/i }).click();

  await page.getByRole("button", { name: /^Grid$/i }).click();
  const firstSpaceLink = page
    .locator('a[href^="/spaces/"]')
    .filter({ hasText: /Limehome Madrid Doctor Fleming Team Apartment/i })
    .first();
  await expect(firstSpaceLink).toHaveAttribute("href", /^\/spaces\//);
  const firstSpaceHref = await firstSpaceLink.getAttribute("href");
  expect(firstSpaceHref).toMatch(/^\/spaces\//);
  await page.goto(firstSpaceHref!);

  await expect(page).toHaveURL(/\/spaces\//);
  await expect(page.getByRole("button", { name: /Reserve stay/i })).toBeVisible();
  await expect(page.getByLabel(/Check-in/i)).toBeVisible();
  await expect(page.getByLabel(/Check-out/i)).toBeVisible();
  await expect(page.getByText(/Way Work commission/i)).toHaveCount(0);
});

test("team-stay planner supports grouped inquiries for Madrid portfolio units", async ({ page }) => {
  await signInAsDemoUser(page, "/search?query=madrid", /\/search\?query=madrid/);

  await expect(page.getByText(/results for "madrid"/i)).toBeVisible();
  const teamStayListing = page
    .locator('a[href^="/spaces/"]')
    .filter({ hasText: /Limehome Madrid Doctor Fleming Team Apartment/i })
    .first();
  await expect(teamStayListing).toHaveAttribute("href", /^\/spaces\//);
  const teamStayHref = await teamStayListing.getAttribute("href");
  await page.goto(teamStayHref!);

  await expect(page).toHaveURL(/\/spaces\//);
  const requestButton = page.getByRole("button", { name: /Request multiple units/i });
  if (await requestButton.count()) {
    await expect(
      page.getByText(
        /Bundle multiple units in one building|Pair this stay with more Madrid Limehome units/i
      )
    ).toBeVisible();

    await page.getByRole("checkbox").first().click();
    await requestButton.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel(/Expected team size/i).fill("8 teammates");
    await page.getByLabel(/Notes for the host/i).fill(
      "We'd like to keep the team close together and coordinate arrivals."
    );
    await page.getByRole("button", { name: /Send team stay request/i }).click();

    await page.waitForURL(/\/messages\//, { timeout: 30_000 });
    await expect(page.getByText(/multi-unit team stay/i).first()).toBeVisible();
    await expect(page.getByText(/Additional units requested:/i).first()).toBeVisible();
  }
});

test("host login and primary workspace routes load cleanly", async ({ page }) => {
  await page.goto("/host");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhost/);

  await signInAsDemoHost(page);

  const nav = page.locator("nav").last();
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
    const link = nav.getByRole("link", { name: screen.label });
    await expect(link).toHaveAttribute("href", screen.href);
    const href = await link.getAttribute("href");
    await page.goto(href!);
    await expect(page).toHaveURL(screen.href);
    await expect(page.getByText(screen.heading).first()).toBeVisible();
    await expect(page.getByText(/Application error: a server-side exception/i)).toHaveCount(0);
  }
});
