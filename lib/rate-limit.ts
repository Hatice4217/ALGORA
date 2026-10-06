// Global rate limiter — Upstash Redis (REST) primary + in-memory fallback.
//
// B1 onarımı (zaafiyet turu 1 bulgusu): eski in-memory sayaç her serverless
// instance'ta AYRI tutuluyordu → istekler instance'lara dağılırken limit
// fiilen deliniyordu. Upstash ile sayaç GLOBAL olur (tüm instance'lar aynı
// Redis sayacını okur/yazar).
//
// Fail-open kaskadı (kullanılabilirlik > sıkılık):
//   1. UPSTASH_REDIS_REST_URL/TOKEN tanımlı ve çağrı başarılı → global sayaç
//   2. Env yok (kurulum öncesi deploy) → in-memory (eski davranış, regression yok)
//   3. Upstash çağrısı hata/timeout → in-memory + hata logu (Upstash çöküşü
//      servis kesintisine dönüşmez)
//
// Semantik: fixed window (ilk isabet anında pencere açılır) — eski in-memory
// davranışının birebir global karşılığı. Tek pipeline round-trip:
//   INCR key            → penceredeki isabet sayısı
//   EXPIRE key s NX     → yalnızca anahtar TTL'sizse (ilk isabet) süreyi as
//   TTL key             → kalan saniye (Retry-After için doğru değer)
// Env henüz girilmemişken deploy edilebilir; env girilip redeploy edilince
// aktifleşir.

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

function memoryRateLimit(
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

const UPSTASH_TIMEOUT_MS = 2_000;

// Kopyala-yapıştır hijyeni: Upstash konsolundan kopyalanan değer satır sonuna
// sarıp token İÇİNE \n/boşluk girebilir (canlıda kanıtlandı: header invalid
// olur, istekler sessizce in-memory fallback'e düşer). Token/URL asla beyaz
// boşluk içermediğinden tamamen silinmeleri güvenlidir.
function envTemiz(ad: string): string | undefined {
  const deger = process.env[ad];
  if (!deger) return undefined;
  const temiz = deger.replace(/\s+/g, '');
  return temiz.length > 0 ? temiz : undefined;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const url = envTemiz('UPSTASH_REDIS_REST_URL');
  const token = envTemiz('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) {
    return memoryRateLimit(key, limit, windowMs);
  }

  const redisKey = `rl:${key}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, String(windowSec), 'NX'],
        ['TTL', redisKey],
      ]),
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Upstash HTTP ${response.status}`);
    }
    const results = (await response.json()) as Array<{ result?: number }>;
    const count = results?.[0]?.result;
    const ttl = results?.[2]?.result;
    if (typeof count !== 'number') {
      throw new Error('Upstash INCR sonucu okunamadı');
    }
    if (count > limit) {
      return {
        ok: false,
        retryAfterSec: typeof ttl === 'number' && ttl > 0 ? ttl : windowSec,
      };
    }
    return { ok: true, retryAfterSec: 0 };
  } catch (error) {
    console.error('rateLimit: Upstash hatası (in-memory fallback devrede):', error);
    return memoryRateLimit(key, limit, windowMs);
  }
}

// Anahtarı tamamen temizler. Login proxy'sinde kullanılır: başarılı giriş,
// o IP'nin birikmiş BAŞARISIZ denemelerini affeder (lockout-success-reset
// deseni) — NAT arkasındaki sınıfın meşru girişleri, birkaç hatalı deneme
// yüzünden kilitlenmeye takılmaz. (Saldırgan başarı üretemeyeceğinden
// sıfırlama yetkisi yalnızca meşru kullanıcıdadır.)
// Hata durumunda hata YUTULMAZ (loglanır): Upstash'ten silinemezse sayaç
// pencere sonunda kendi kendine düşer — false-affetme riski yok.
export async function resetRateLimit(key: string): Promise<void> {
  buckets.delete(key);
  const url = envTemiz('UPSTASH_REDIS_REST_URL');
  const token = envTemiz('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return;
  try {
    // NOT: /del REST endpoint'i canlı testte sessizce 0 döndürüp SİLMEDİ;
    // pipeline içinde DEL ise kanıtlandı (EXISTS 1 → DEL 1 → EXISTS 0).
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([['DEL', `rl:${key}`]]),
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Upstash DEL HTTP ${response.status}`);
    }
    const results = (await response.json()) as Array<{ result?: number }>;
    if (results?.[0]?.result !== 1) {
      // Silinecek sayaç yoktu — login başarı akışında olağan (pencere bitmiş olabilir)
      console.log(`resetRateLimit: rl:${key} Upstash'te yoktu (zaten temiz)`);
    }
  } catch (error) {
    console.error('resetRateLimit: Upstash DEL hatası (yerel sayaç silindi, global sayaç pencere sonunda düşer):', error);
  }
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
