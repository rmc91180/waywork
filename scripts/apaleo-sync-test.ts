import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type {
  ApaleoAriPayload,
  ApaleoReservation,
  ApaleoReservationWebhook,
} from "@/lib/pms/apaleo-client";
import { ApaleoClient } from "@/lib/pms/apaleo-client";
import {
  expandApaleoAriUpdates,
  normalizeApaleoReservationDetail,
} from "@/lib/pms/apaleo-sync";

function loadFixture<T>(name: string) {
  const fixturePath = path.join(process.cwd(), "scripts", "fixtures", "apaleo", name);
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as T;
}

async function run() {
  const client = new ApaleoClient({
    apiBaseUrl: "https://api.apaleo.com",
    identityBaseUrl: "https://identity.apaleo.com",
    clientId: "client-id-123",
    clientSecret: "client-secret-123",
    fixtureDir: path.join(process.cwd(), "scripts", "fixtures", "apaleo"),
  });

  const ariPayload = loadFixture<ApaleoAriPayload>("ari-update.json");
  const webhook = loadFixture<ApaleoReservationWebhook>("webhook-reservation.json");
  const reservation = loadFixture<ApaleoReservation>("reservation-detail.json");
  const reservations = await client.listReservations();
  const ariSnapshot = await client.getAriSnapshot();
  const reservationFromClient = await client.getReservation(webhook.data?.entityId || "");

  const expanded = expandApaleoAriUpdates(ariPayload);
  const normalized = normalizeApaleoReservationDetail(reservation);

  assert.equal(expanded.length, 2);
  assert.equal(expanded[0]?.propertyId, "MADRID-CENTRO");
  assert.equal(expanded[0]?.availability, 1);
  assert.equal(expanded[1]?.amount, 169);
  assert.equal(normalized.externalReservationId, "reservation-123");
  assert.equal(normalized.currencyCode, "EUR");
  assert.equal(normalized.guestName, "Limehome Guest");
  assert.equal(reservations.length, 1);
  assert.equal(ariSnapshot.length, 2);
  assert.equal(reservationFromClient.id, webhook.data?.entityId);

  console.log("[apaleo-sync] PASS");
  console.log(
    `[apaleo-sync] Expanded ${expanded.length} ARI updates and verified ${reservations.length} fixture reservations.`
  );
}

run().catch((error) => {
  console.error("[apaleo-sync] FAIL", error);
  process.exit(1);
});
