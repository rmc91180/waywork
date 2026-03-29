import { getAllLimehomePilotSlugs, getLimehomePilotMeta } from "../src/lib/limehome-pilot";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const slugs = getAllLimehomePilotSlugs();

assert(slugs.length === 5, "expected five Limehome pilot listings");

for (const slug of slugs) {
  const meta = getLimehomePilotMeta({ slug });
  assert(meta, `expected merchandising metadata for ${slug}`);
  assert(meta.bestFor.length > 0, `expected bestFor copy for ${slug}`);
  assert(meta.summary.length > 0, `expected summary copy for ${slug}`);
}

console.log("limehome-pilot-merchandising-test: ok");
