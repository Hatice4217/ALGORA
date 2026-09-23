// Admin route'ları için paylaşılan key doğrulama
import { createHash, timingSafeEqual } from 'crypto';

// x-admin-key header'ını ADMIN_SECRET_KEY env ile karşılaştırır.
// sha256 üzerinden timingSafeEqual: uzunluk farkının throw'u ve timing sızıntısı aynı anda önlenir.
export function verifyAdminKey(provided: string | null): boolean {
  const expected = process.env.ADMIN_SECRET_KEY ?? '';
  if (!expected) return false;
  return timingSafeEqual(
    createHash('sha256').update(provided ?? '').digest(),
    createHash('sha256').update(expected).digest()
  );
}
