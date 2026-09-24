// Paket kota ve ödeme yapılandırması (sunucu tarafı zorlama için tek kaynak)
import type { PlanId } from '@/types/subscription';

// Kredi limitleri. DÖNEM UZUNLUKLARI FARKLIDIR:
//   free    → 10 soru / GÜN   (her gün yenilenir — SQL tarafı: INTERVAL '1 day')
//   pro     → 1000 soru / AY  (ödeme dönemiyle uyumlu — INTERVAL '1 month')
//   premium → 5000 soru / AY
// DİKKAT: database/subscriptions.sql içindeki rollover/seed fonksiyonlarıyla senkron tutulmalı.
export const PLAN_LIMITS: Record<PlanId, number> = {
  free: 10,
  pro: 1000,
  premium: 5000,
};

// Manuel ödeme (havale/EFT) bilgileri.
// !!! PLACEHOLDER — yayına almadan önce gerçek bilgilerle doldurulmalı. !!!
export const PAYMENT_INFO = {
  bankName: 'BANKA ADI (doldurulacak)',
  accountName: 'ALGORA (hesap sahibi — doldurulacak)',
  iban: 'TR00 0000 0000 0000 0000 0000 00',
  descriptionNote: 'Havale açıklamasına kayıtlı olduğunuz e-posta adresinizi yazın.',
};
