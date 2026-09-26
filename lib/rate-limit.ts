// Basit in-memory sliding-window rate limiter.
// NOT: Vercel serverless'ta instance-bazlı çalışır (her lambda kendi sayacını tutar);
// küçük ölçekte yeterli koruma sağlar. Global limite gerek olursa Upstash gibi
// harici store'a geçilmeli.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bellek taşmasını önle: eşik aşılırsa süresi geçen girdileri süpür
const MAX_BUCKETS = 10_000;

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      pruneExpired(now);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Vercel/Next arkasındaki gerçek istemci IP'si (ilk hop)
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
