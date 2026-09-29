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

// Anahtarı tamamen temizler. Login proxy'sinde kullanılır: başarılı giriş,
// o IP'nin birikmiş BAŞARISIZ denemelerini affeder (lockout-success-reset
// deseni) — NAT arkasındaki sınıfın meşru girişleri, birkaç hatalı deneme
// yüzünden kilitlenmeye takılmaz. (Saldırgan başarı üretemeyeceğinden
// sıfırlama yetkisi yalnızca meşru kullanıcıdadır.)
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

// Gerçek istemci IP'si. SPOOF NOTU (F1): XFF'nin İLK hop'u istemcinin kendisi
// yazabilir — ilk hop'u almak, sahte header'la sayaç bölmeye izin verirdi.
// Vercel edge istemci-sağlaması XFF zincirini korur ve GERÇEK bağlantı IP'sini
// SONA ekler; x-real-ip'yi de platform kendisi yazar (istemci ezemez).
// Güvenilirlik sırası: x-real-ip → XFF son hop → 'unknown'.
export function getClientIp(request: Request): string {
  const real = request.headers.get('x-real-ip');
  if (real) {
    return real.trim();
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const hoplar = forwarded.split(',').map((h) => h.trim()).filter(Boolean);
    if (hoplar.length > 0) return hoplar[hoplar.length - 1];
  }
  return 'unknown';
}
