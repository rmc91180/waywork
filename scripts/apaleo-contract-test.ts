import { strict as assert } from "node:assert";
import path from "node:path";
import { ApaleoClient } from "@/lib/pms/apaleo-client";

async function run() {
  const client = new ApaleoClient({
    apiBaseUrl: "https://api.apaleo.com",
    identityBaseUrl: "https://identity.apaleo.com",
    clientId: "client-id-123",
    clientSecret: "client-secret-123",
    redirectUri: "https://waywork.example/api/pms/apaleo/callback",
    fixtureDir: path.join(process.cwd(), "scripts", "fixtures", "apaleo"),
  });

  const token = await client.exchangeCodeForTokens("auth-code-123");
  const properties = await client.listProperties();
  const unitGroups = await client.listUnitGroups();
  const ratePlans = await client.listRatePlans();
  const booking = await client.createBooking({
    reservations: [{ unitGroupId: "UG-CENTRO-STUDIO" }],
  });
  const webhookSubscription = await client.createWebhookSubscription({
    endpointUrl: "https://waywork.example/api/pms/apaleo/webhooks",
  });
  const ariSubscription = await client.createAriSubscription({
    endpointUrl: "https://waywork.example/api/pms/apaleo/ari",
  });

  assert.equal(token.refresh_token, "refresh-token-123");
  assert.equal(properties.length, 2);
  assert.equal(properties[0]?.city, "Madrid");
  assert.equal(unitGroups[1]?.propertyId, "MADRID-CHAMARTIN");
  assert.equal(ratePlans[0]?.unitGroupId, "UG-CENTRO-STUDIO");
  assert.equal(booking.id, "booking-123");
  assert.equal(webhookSubscription.id, "webhook-subscription-123");
  assert.equal(ariSubscription.id, "ari-subscription-123");

  console.log("[apaleo-contract] PASS");
  console.log(
    `[apaleo-contract] Verified ${properties.length} properties, ${unitGroups.length} unit groups, and ${ratePlans.length} rate plans.`
  );
}

run().catch((error) => {
  console.error("[apaleo-contract] FAIL", error);
  process.exit(1);
});
