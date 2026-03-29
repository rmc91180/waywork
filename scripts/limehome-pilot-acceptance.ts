type SearchListing = {
  id: string;
  title: string;
  slug: string;
};

function resolveAppUrl() {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestText(url: string) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return text;
}

async function requestJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function main() {
  const appUrl = resolveAppUrl();
  const homeHtml = await requestText(`${appUrl}/`);
  assert(homeHtml.includes("Way Work"), "homepage did not render");

  const searchPayload = await requestJson<{ listings: SearchListing[] }>(
    `${appUrl}/api/search?query=madrid`
  );

  const limehomeListings = searchPayload.listings.filter((listing) =>
    listing.title.startsWith("Limehome Madrid")
  );

  assert(limehomeListings.length >= 5, "expected at least five Limehome Madrid listings");

  const doctorFleming = limehomeListings.find((listing) =>
    listing.slug === "limehome-madrid-doctor-fleming-team-apartment"
  );
  assert(doctorFleming, "expected Doctor Fleming listing in Madrid search results");

  for (const listing of limehomeListings.slice(0, 5)) {
    const detailHtml = await requestText(`${appUrl}/spaces/${listing.id}`);
    assert(detailHtml.includes("Reserve stay"), `listing page missing booking CTA for ${listing.slug}`);
  }

  const teamStayHtml = await requestText(`${appUrl}/spaces/${doctorFleming.id}`);
  assert(
    teamStayHtml.includes("Request multiple units"),
    "team-stay planner CTA missing for Doctor Fleming"
  );

  console.log("limehome-pilot-acceptance: ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
