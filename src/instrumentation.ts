export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkEnvAtBoot } = await import("@/lib/env");
  checkEnvAtBoot();
}
