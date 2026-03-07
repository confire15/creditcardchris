import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash sliding-window rate limiters (persistent across Vercel cold starts).
// Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars.
// Falls back to in-memory (dev only) when Upstash is not configured.

type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

// --- Upstash path -----------------------------------------------------------

let _redis: Redis | null = null;
const _limiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

function getUpstashLimiter(name: string, maxRequests: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!_limiters.has(name)) {
    _limiters.set(
      name,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs / 1000} s`),
        prefix: `rl:${name}`,
      })
    );
  }
  return _limiters.get(name)!;
}

// --- In-memory fallback (local dev) ----------------------------------------

type Entry = { count: number; resetAt: number };
const _stores = new Map<string, Map<string, Entry>>();

function inMemoryCheck(
  name: string,
  key: string,
  config: { windowMs: number; maxRequests: number }
): RateLimitResult {
  if (!_stores.has(name)) _stores.set(name, new Map());
  const store = _stores.get(name)!;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(config.maxRequests - entry.count, 0),
    resetAt: entry.resetAt,
  };
}

// --- Public API ------------------------------------------------------------

export async function checkRateLimit(
  name: string,
  key: string,
  config: { windowMs: number; maxRequests: number }
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(name, config.maxRequests, config.windowMs);

  if (limiter) {
    const { success, remaining, reset } = await limiter.limit(key);
    return { allowed: success, remaining, resetAt: reset };
  }

  // Fallback: in-memory (not reliable across instances — fine for local dev)
  return inMemoryCheck(name, key, config);
}

export const RATE_LIMITS = {
  chat:           { windowMs: 60_000, maxRequests: 20 },
  recommendAi:    { windowMs: 60_000, maxRequests: 30 },
  pushSubscribe:  { windowMs: 60_000, maxRequests: 5  },
  stripeCheckout: { windowMs: 60_000, maxRequests: 3  },
} as const;
