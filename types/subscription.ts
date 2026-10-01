// Paket/Abonelik tipleri (types/question.ts düz-interface stili)

export type PlanId = 'free' | 'pro' | 'premium';

export type SubscriptionStatus = 'active' | 'pending' | 'cancelled';

export type CreditTransactionReason =
  | 'generation' // -1: eski anlık üretim tüketimi (V2'de emekli; tarihsel kayıtlarda)
  | 'higher_brain' // -1: AI Özel Hoca (Üst Beyin) derin çözüm tüketimi — V2
  | 'monthly_reset' // +N: günlük kredi yenilenmesi
  | 'plan_change' // +N: paket yükseltmesi (approve)
  | 'admin_adjust' // +N/-N: admin manuel bakiye müdahalesi
  | 'refund'; // +1: Gemini hata iadesi

export type PaymentClaimStatus = 'pending' | 'approved' | 'rejected';

export type PaidPlanId = 'pro' | 'premium';

// UI'da gösterilen paket bilgisi (fiyat/özellikler). Kredi limitleri için
// lib/subscription-config.ts > PLAN_LIMITS kullanılır.
export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number; // TL/ay, free için 0
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Başlangıç',
    price: 0,
    description: 'Sistemi keşfetmek isteyenler için temel özellikler ve günlük 3 Üst Beyin anlatım hakkı.',
    features: [
      'Havuzdan Soru Çözme: Sınırsız',
      '3 Adımlı Sokratik İpucu: Sınırsız ve Ücretsiz',
      'AI Üst Beyin Kredisi (Günlük Limit): 3 Kredi / Gün',
      'Platform arayüzüne tam erişim',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Öğrenci',
    price: 199,
    description: 'Düzenli çalışan öğrenciler için her gün yenilenen 20 Üst Beyin özel ders hakkı.',
    features: [
      'Havuzdan Soru Çözme: Sınırsız',
      '3 Adımlı Sokratik İpucu: Sınırsız ve Ücretsiz',
      'AI Üst Beyin Kredisi (Günlük Limit): 20 Kredi / Gün',
    ],
    highlighted: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium AI Koçluk',
    price: 499,
    description: 'Derece hedefleyenler için maksimum AI desteği ve çok yakında eklenecek özel koçluk özellikleri.',
    features: [
      'Havuzdan Soru Çözme: Sınırsız',
      '3 Adımlı Sokratik İpucu: Sınırsız ve Ücretsiz',
      'AI Üst Beyin Kredisi (Günlük Limit): 50 Kredi / Gün',
      'Yapay Zeka Destekli YKS Koçu (Yakında)',
      'Detaylı Gelişim ve Zayıf Konu Analitiği (Yakında)',
    ],
  },
};

// subscriptions tablosu satırı
export interface Subscription {
  id?: string;
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  credits_remaining: number;
  credits_limit: number;
  period_start: string;
  period_end: string;
  // V2: ücretli planın satın alma bitişi (NULL = free). period_end günlük kota dönemidir.
  paid_until?: string | null;
  created_at?: string;
  updated_at?: string;
}

// credit_transactions tablosu satırı
export interface CreditTransaction {
  id?: string;
  user_id: string;
  amount: number; // -1 tüketim / +N reset, iade, admin müdahalesi
  reason: CreditTransactionReason;
  created_at?: string;
}

// payment_claims tablosu satırı
export interface PaymentClaim {
  id?: string;
  user_id: string;
  plan: PaidPlanId;
  status: PaymentClaimStatus;
  sender_name?: string;
  reference_note?: string;
  provider: string; // 'manual' — ileride 'iyzico' / 'paytr'
  provider_ref?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
}

// GET /api/subscription yanıtı — Paketim sekmesini tek çağrıda doldurur
export interface SubscriptionSummary {
  subscription: Subscription;
  transactions: CreditTransaction[];
  pending_claim: PaymentClaim | null;
}
