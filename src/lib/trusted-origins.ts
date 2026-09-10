type Source = Record<string, string | undefined>;

export function toOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).origin;
  } catch {
    return null;
  }
}

export function trustedOrigins(source: Source = process.env): string[] {
  const candidates = [
    source.BETTER_AUTH_URL,
    source.NEXT_PUBLIC_APP_URL,
    source.VERCEL_URL,
    source.VERCEL_BRANCH_URL,
    source.VERCEL_PROJECT_PRODUCTION_URL,
    ...(source.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(","),
  ];
  return [...new Set(candidates.map(toOrigin).filter((origin): origin is string => origin !== null))];
}
