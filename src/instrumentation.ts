export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkEnvAtBoot, isProduction } = await import("@/lib/env");
  checkEnvAtBoot();

  if (isProduction(process.env)) {
    const { legalFieldsToComplete } = await import("@/lib/legal");
    const missing = legalFieldsToComplete();
    if (missing.length > 0) {
      console.warn(
        `[légal] Mentions légales incomplètes (${missing.join(", ")}) : complétez src/lib/legal.ts.`
      );
    }
  }
}
