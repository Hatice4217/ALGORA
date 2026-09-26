// E-posta onay token'ı: HMAC-SHA256 imzalı + süreli.
// Eski token düz base64(email) idi → herkes her adres için geçerli token üretebiliyordu.
// Anahtar: ADMIN_SECRET_KEY'den alan-ayrıştırılmış türetme (yeni env gerektirmez).
import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat — mail metniyle aynı vaat

function getTokenSecret(): string | null {
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey) return null;
  return createHmac('sha256', adminKey).update('verify-email-token-v1').digest('hex');
}

export function createEmailVerificationToken(
  email: string,
  ttlMs: number = TOKEN_TTL_MS
): string | null {
  const secret = getTokenSecret();
  if (!secret) return null;
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + ttlMs }),
    'utf8'
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export type EmailTokenResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'malformed' | 'invalid' | 'expired' };

export function verifyEmailVerificationToken(token: string): EmailTokenResult {
  const secret = getTokenSecret();
  if (!secret) return { ok: false, reason: 'invalid' };

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: 'malformed' };
  }
  const [payload, signature] = parts;

  const expected = createHmac('sha256', secret).update(payload).digest();
  const provided = Buffer.from(signature, 'base64url');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: 'invalid' };
  }

  let parsed: { email?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof parsed.email !== 'string' || typeof parsed.exp !== 'number') {
    return { ok: false, reason: 'malformed' };
  }
  if (Date.now() > parsed.exp) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, email: parsed.email };
}
