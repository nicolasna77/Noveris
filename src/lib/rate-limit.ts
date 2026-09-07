import { headers } from "next/headers";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Construit à la demande, pas au chargement du module — Redis.fromEnv() lit
// UPSTASH_REDIS_REST_URL/TOKEN et lèverait sinon dès l'import de ce fichier
// si ces variables ne sont pas encore renseignées (ex. build Vercel avant
// configuration de l'intégration Upstash), comme getOpenAIClient() dans
// src/lib/voice-agent/tools.ts.
let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

// IP du visiteur derrière le proxy Vercel — x-forwarded-for peut contenir
// plusieurs adresses (client, proxies intermédiaires), la première est celle
// du visiteur. "unknown" en dev local (pas de proxy) : le rate limiting
// dégénère alors en une seule clé globale, ce qui est sans conséquence hors
// production.
export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

// Limiteurs génériques (formulaire de contact, /api/usage-events) — un
// Ratelimit par (identifiant, fenêtre, max) plutôt qu'un seul partagé, pour
// que chaque appelant garde des seuils indépendants sans se marcher dessus.
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

// Renvoie true si la requête est autorisée, false si le seuil est dépassé —
// à appeler avec l'IP du visiteur (voir getClientIp) comme `key`. Ouvre en
// cas d'échec Redis (indisponibilité, UPSTASH_REDIS_REST_URL/TOKEN pas
// encore configurées) : le rate limiting est une protection en plus, pas le
// seul rempart — le formulaire de contact ou /api/usage-events doivent
// continuer à fonctionner même si Redis est momentanément injoignable.
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

// Adapte Redis au format `customStorage` attendu par le rate limiting natif
// de better-auth (voir src/lib/auth.ts) — un `count`/`lastRequest` fenêtre
// glissante, comme son propre backend "memory", mais partagé entre toutes
// les instances serverless. `consume` utilise l'INCR atomique de Redis
// plutôt qu'un lire-puis-écrire : sous forte concurrence (plusieurs
// tentatives de connexion simultanées), ça évite qu'elles passent toutes en
// lisant le même compteur avant qu'aucune ne l'ait encore incrémenté.
// `get`/`set` ne sont là que pour satisfaire le type attendu — dès que
// `consume` est fourni, better-auth ne les appelle jamais (voir
// onRequestRateLimit dans node_modules/better-auth/dist/api/rate-limiter) —
// on leur donne quand même un TTL raisonnable au cas où.
//
// `consume` ouvre (autorise) en cas d'échec Redis plutôt que de laisser
// l'erreur remonter : better-auth n'entoure pas cet appel d'un try/catch,
// une exception ici casserait la connexion/inscription entièrement (ex. tant
// que UPSTASH_REDIS_REST_URL/TOKEN ne sont pas encore configurées) — un
// rate limiting momentanément absent est bien préférable à un site où
// personne ne peut plus se connecter.
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
