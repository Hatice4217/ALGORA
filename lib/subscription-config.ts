// Paket kota ve ödeme yapılandırması (sunucu tarafı zorlama için tek kaynak)
import type { PlanId } from '@/types/subscription';

// V2 KREDİ MODELİ (30 Eylül 2026, BAP danışman kararı — credit_pivot_gunluk.sql):
// Kredi artık "AI Özel Hoca (Üst Beyin)" kredisidir. Havuzdan soru çekmek/çözmek
// SINIRSIZ ve ÜCRETSİZDİR; kredi yalnızca derin çözüm/anlatım talebinde düşer.
// HEPSİ GÜNLÜKTÜR (dönem = 1 gün; gece yarısı lazy rollover ile yenilenir):
//   free    → 3 Üst Beyin / GÜN
//   pro     → 15 Üst Beyin / GÜN (5 Eki 2026: V2 fiyatlama matrisi başlangıç değerleri)
//   premium → 30 Üst Beyin / GÜN (5 Eki 2026: V2 fiyatlama matrisi başlangıç değerleri)
// DİKKAT: database/subscriptions.sql ve database/credit_pivot_gunluk.sql içindeki
// rollover/seed fonksiyonlarıyla senkron tutulmalıdır (SQL tarafında 3/15/30 —
// canlıya uygulama: database/kredi_15_30.sql).
// NOT: Ücretli planın satın alma süresi subscriptions.paid_until'tedir (aylık);
// period_end ise günlük kota dönemidir — ikisi artık farklı kavramlardır.
export const PLAN_LIMITS: Record<PlanId, number> = {
  free: 3,
  pro: 15,
  premium: 30,
};

// Manuel ödeme (havale/EFT) bilgileri.
// !!! PLACEHOLDER — yayına almadan önce gerçek bilgilerle doldurulmalı. !!!
export const PAYMENT_INFO = {
  bankName: 'BANKA ADI (doldurulacak)',
  accountName: 'ALGORA (hesap sahibi — doldurulacak)',
  iban: 'TR00 0000 0000 0000 0000 0000 00',
  descriptionNote: 'Havale açıklamasına kayıtlı olduğunuz e-posta adresinizi yazın.',
};
