import { headers } from "next/headers";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(id: string, window: `${number} ${"s" | "m" | "h"}`, max: number): Ratelimit {
  const cacheKey = `${id}:${window}:${max}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: `ratelimit:${id}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

export async function checkRateLimit(
  id: string,
  key: string,
  window: `${number} ${"s" | "m" | "h"}`,
  max: number
): Promise<boolean> {
  try {
    const { success } = await getLimiter(id, window, max).limit(key);
    return success;
  } catch (err) {
    console.error(`[rate-limit] Redis indisponible pour "${id}", requête autorisée par défaut :`, err);
    return true;
  }
}

export const redisRateLimitStorage = {
  async get(key: string) {
    try {
      const value = await getRedis().get<{ key: string; count: number; lastRequest: number }>(key);
      return value ?? null;
    } catch (err) {
      console.error("[rate-limit] Redis get indisponible :", err);
      return null;
    }
  },
  async set(key: string, value: { key: string; count: number; lastRequest: number }) {
    try {
      await getRedis().set(key, value, { ex: 3600 });
    } catch (err) {
      console.error("[rate-limit] Redis set indisponible :", err);
    }
  },
  async consume(key: string, rule: { window: number; max: number }) {
    try {
      const count = await getRedis().incr(key);
      if (count === 1) await getRedis().expire(key, rule.window);
      if (count <= rule.max) return { allowed: true, retryAfter: null };
      const ttl = await getRedis().ttl(key);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : rule.window };
    } catch (err) {
      console.error("[rate-limit] Redis indisponible pour l'authentification, requête autorisée par défaut :", err);
      return { allowed: true, retryAfter: null };
    }
  },
};
