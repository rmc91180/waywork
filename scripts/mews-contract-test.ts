import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { MewsClient } from "@/lib/pms/mews-client";

interface CapturedCall {
  url: string;
  body: Record<string, unknown>;
}

function loadFixture(name: string) {
  const fixturePath = path.join(process.cwd(), "scripts", "fixtures", "mews", name);
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
}

async function run() {
  const calls: CapturedCall[] = [];
  const originalFetch = globalThis.fetch;

  const processGroupResponse = loadFixture("process-group-response.json");
  const requestAriResponse = loadFixture("request-ari-response.json");
  const confirmationResponse = loadFixture("confirmation-response.json");

  globalThis.fetch = (async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;

    calls.push({ url, body });

    let responsePayload: Record<string, unknown> = confirmationResponse;
    if (url.endsWith("/processGroup")) responsePayload = processGroupResponse;
    if (url.endsWith("/requestAriUpdate")) responsePayload = requestAriResponse;

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const client = new MewsClient({
      apiBaseUrl: "https://api.mews.com/",
      clientToken: "client-token-123",
      connectionToken: "connection-token-123",
      accessToken: "access-token-123",
      enterpriseId: "enterprise-123",
      clientName: "WayWork Contract Test/1.0",
    });

    await client.processGroup({
      MessageId: "msg-1",
      Reservations: [
        {
          ChannelManagerBookingId: "booking-1",
          State: "Confirmed",
          StartDate: "2026-03-10",
          EndDate: "2026-03-12",
          SpaceTypeCode: "SPACE-1",
          RatePlanCode: "RATE-1",
          CurrencyCode: "USD",
          TotalAmount: 220,
          NumberOfGuests: 2,
        },
      ],
    });

    await client.requestAriUpdate({
      MessageId: "msg-2",
      Extent: { StartDate: "2026-03-01", EndDate: "2026-06-01" },
      SpaceTypeCodes: ["SPACE-1"],
    });

    await client.updateAvailabilityConfirmation({
      MessageId: "msg-3",
      Acknowledged: true,
    });

    await client.updatePricesConfirmation({
      MessageId: "msg-4",
      Acknowledged: true,
    });

    await client.updateRestrictionsConfirmation({
      MessageId: "msg-5",
      Acknowledged: true,
    });

    await client.processGroupConfirmation({
      MessageId: "msg-6",
      Acknowledged: true,
    });

    await client.connector("reservations/getAll", {
      Limitation: { Count: 10 },
    });

    assert.equal(calls.length, 7, "Expected seven Mews API contract calls.");

    const processGroupCall = calls.find((call) => call.url.endsWith("/processGroup"));
    assert.ok(processGroupCall, "processGroup endpoint should be called.");
    assert.equal(processGroupCall?.body.ClientToken, "client-token-123");
    assert.equal(processGroupCall?.body.ConnectionToken, "connection-token-123");
    assert.equal(processGroupCall?.body.Client, "WayWork Contract Test/1.0");

    const requestAriCall = calls.find((call) => call.url.endsWith("/requestAriUpdate"));
    assert.ok(requestAriCall, "requestAriUpdate endpoint should be called.");
    assert.ok(Array.isArray(requestAriCall?.body.SpaceTypeCodes));

    const connectorCall = calls.find((call) => call.url.includes("/api/connector/v1/reservations/getAll"));
    assert.ok(connectorCall, "Connector endpoint should be called.");
    assert.equal(connectorCall?.body.AccessToken, "access-token-123");
    assert.equal(connectorCall?.body.EnterpriseId, "enterprise-123");

    console.log("[mews-contract] PASS");
    console.log(`[mews-contract] Verified ${calls.length} fixture-backed requests.`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

run().catch((error) => {
  console.error("[mews-contract] FAIL", error);
  process.exit(1);
});
