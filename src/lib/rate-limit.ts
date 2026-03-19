type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  cleanupExpiredEntries(now);

  const existing = rateLimitStore.get(options.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;

    rateLimitStore.set(options.key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: Math.max(options.limit - 1, 0),
      resetAt,
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  rateLimitStore.set(options.key, existing);

  return {
    allowed: true,
    remaining: Math.max(options.limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export function buildRateLimitKey(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(":");
}
