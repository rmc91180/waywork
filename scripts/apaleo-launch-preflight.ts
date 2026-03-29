import { getApaleoPilotPreflightSummary } from "../src/lib/pms/apaleo-pilot-preflight";

async function main() {
  const summary = await getApaleoPilotPreflightSummary();

  console.log(`[apaleo-preflight] state: ${summary.state}`);
  console.log(`[apaleo-preflight] onlyCredentialsRemain: ${summary.onlyCredentialsRemain}`);
  console.log(`[apaleo-preflight] liveCutoverReady: ${summary.liveCutoverReady}`);
  console.log(`[apaleo-preflight] next: ${summary.recommendedNextStep}`);

  if (summary.nonCredentialTasks.length > 0) {
    console.log("[apaleo-preflight] remaining non-credential tasks:");
    for (const task of summary.nonCredentialTasks) {
      console.log(`- ${task}`);
    }
  }

  if (summary.credentialTasks.length > 0) {
    console.log("[apaleo-preflight] remaining credential inputs:");
    for (const task of summary.credentialTasks) {
      console.log(`- ${task}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
