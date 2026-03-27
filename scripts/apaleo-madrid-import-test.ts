import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type { ApaleoProperty, ApaleoRatePlan, ApaleoUnitGroup } from "@/lib/pms/apaleo-client";
import { buildApaleoMadridImportCandidates } from "@/lib/pms/apaleo-import";

function loadFixture<T>(name: string) {
  const fixturePath = path.join(process.cwd(), "scripts", "fixtures", "apaleo", name);
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as T;
}

async function run() {
  const properties = loadFixture<ApaleoProperty[]>("properties.json");
  const unitGroups = loadFixture<ApaleoUnitGroup[]>("unit-groups.json");
  const ratePlans = loadFixture<ApaleoRatePlan[]>("rate-plans.json");

  const candidates = buildApaleoMadridImportCandidates({
    properties,
    unitGroups,
    ratePlans,
  });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0]?.city, "Madrid");
  assert.equal(candidates[0]?.currency, "EUR");
  assert.ok(candidates[0]?.slug.includes("limehome-madrid-centro"));
  assert.equal(candidates[1]?.workspaceType, "HOME_OFFICE");
  assert.equal(candidates[1]?.connectivity?.declaredDownloadMbps, 250);

  console.log("[apaleo-madrid-import] PASS");
  console.log(`[apaleo-madrid-import] Built ${candidates.length} Madrid import candidates.`);
}

run().catch((error) => {
  console.error("[apaleo-madrid-import] FAIL", error);
  process.exit(1);
});
