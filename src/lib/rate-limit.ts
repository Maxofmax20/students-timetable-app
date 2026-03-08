type LimitRecord = {
  count: number;
  resetAt: number;
};

const limiterStore = new Map<string, LimitRecord>();

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export function getClientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = limiterStore.get(key);

  if (!current || current.resetAt <= now) {
    limiterStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      ok: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  limiterStore.set(key, current);

  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

export function withRateLimitHeaders(response: Response, result: RateLimitResult) {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('Retry-After', String(result.retryAfterSeconds));
  return response;
}
