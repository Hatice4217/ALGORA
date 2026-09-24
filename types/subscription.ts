// Paket/Abonelik tipleri (types/question.ts düz-interface stili)

export type PlanId = 'free' | 'pro' | 'premium';

export type SubscriptionStatus = 'active' | 'pending' | 'cancelled';

export type CreditTransactionReason =
  | 'generation' // -1: AI soru üretimi tüketimi
  | 'monthly_reset' // +N: dönem yenilenmesi
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
    description: 'Sistemi keşfetmek ve yapay zekanın gücünü test etmek isteyenler için.',
    features: [
      'Günlük 10 AI soru kredisi — her gün yenilenir',
      'Temel seviye ilerleme takibi',
      'Platform arayüzüne tam erişim',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Öğrenci',
    price: 199,
    description: 'Düzenli çalışan ve eksiklerini nokta atışı görmek isteyen öğrenciler için optimize edilmiştir.',
    features: [
      'Aylık 1000 AI soru/token kredisi',
      'Detaylı yapay zeka konu ve eksik analizi',
      'Geçmişe dönük performans ve ilerleme grafikleri',
      'Aylık standart gelişim raporu',
    ],
    highlighted: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium AI Koçluk',
    price: 499,
    description: 'Sınav sürecinde bir rehbere ihtiyaç duyan ve sınırları kaldırmak isteyenler için.',
    features: [
      'Sınırsız (Adil kullanım kotalı) AI etkileşimi',
      'Yapay Zeka Koçluk Sistemi (Haftalık çalışma programı)',
      'Anlık rota hesaplama ve motivasyon bildirimleri',
      'Veliler için haftalık detaylı e-posta raporları',
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
