'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { PLANS } from '@/types/subscription';
import type { SubscriptionSummary, PaidPlanId, CreditTransaction } from '@/types/subscription';
import { PAYMENT_INFO } from '@/lib/subscription-config';
import { authFetch } from '@/lib/api';
import { QuotaCountdown } from './QuotaCountdown';

// Kredi hareketi sebep etiketleri (V2: monthly_reset = günlük yenileme — tüm planlar)
// NOT: 'generation' etiketi tarihsel kayıtlar için duruyor ama listede GÖSTERİLMEZ (aşağıda filtrelenir) —
// V2 öncesi dönemden kalan eski hareketleri gizli tutar.
const REASON_LABELS: Record<CreditTransaction['reason'], string> = {
  generation: 'Soru üretimi (eski)',
  higher_brain: 'AI Üst Beyin (Özel Hoca)',
  monthly_reset: 'Günlük kredi yenileme',
  plan_change: 'Paket değişimi',
  admin_adjust: 'Yönetici düzeltmesi',
  refund: 'Hata iadesi',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

// Paketim sekmesindeki özellik maddelerine açıklayıcı alt metinler.
// Anahtarlar types/subscription.ts > PLANS features dizileriyle birebir eşleşir;
// eşleşmeyen madde açıklamasız kalır (sessiz yutulur, hata üretmez).
const OZELLIK_ACIKLAMALARI: Record<string, string> = {
  'Havuzdan Soru Çözme: Sınırsız':
    'Binlerce onaylanmış soruluk havuzdan dilediğiniz kadar soru çözersiniz — kredi harcamaz.',
  '3 Adımlı Sokratik İpucu: Sınırsız ve Ücretsiz':
    'Takıldığınız soruda çözümü ifşa etmeyen, sizi adım adım düşündüren 3 kademeli ipucu.',
  'Platform arayüzüne tam erişim':
    'Analiz paneli, hedefler, günlük seri ve tüm ders araçlarına erişiminiz tamdır.',
};

// Kredi maddesi plana göre farklı yazıldığı için ("N Kredi / Gün") baştan eşleşir
const ozellikAciklamasi = (madde: string): string => {
  if (madde.startsWith('AI Üst Beyin Kredisi')) {
    return 'Kredi yalnızca "Üst Beyin" tam çözüm anlatımında harcanır ve her gün otomatik yenilenir. Soru çözmek ve ipucu almak kredi istemez.';
  }
  if (madde.endsWith('(Yakında)')) {
    return 'Bu özellik geliştirme aşamasında — çıktığında paketinizde otomatik açılır.';
  }
  return OZELLIK_ACIKLAMALARI[madde] ?? '';
};

interface PackagePanelProps {
  summary: SubscriptionSummary | null;
  onUpgrade: (plan: PaidPlanId) => void;
}

// Sekmeli yapı (5 Eki 2026, kullanıcı kararı): tek uzun akış yerine üç başlık —
// geçmiş yalnızca ilgili sekmede görünür, paket vitrini tam genişliğe çıkar.
type PanelBolumu = 'paketim' | 'paketler' | 'gecmis';

const BOLUMLER: Array<{ id: PanelBolumu; etiket: string }> = [
  { id: 'paketim', etiket: 'Paketim' },
  { id: 'paketler', etiket: 'Paketler' },
  { id: 'gecmis', etiket: 'Geçmiş Kullanımlarım' },
];

export function PackagePanel({ summary, onUpgrade }: PackagePanelProps) {
  const [bolum, setBolum] = useState<PanelBolumu>('paketim');

  if (!summary?.subscription) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-600">
        Paket bilgisi yükleniyor...
      </div>
    );
  }

  const { subscription, transactions, pending_claim } = summary;
  // Soru üretimi (-1) hareketleri gizlenir: yalnızca yenileme/paket/iade olayları kalsın
  const history = transactions.filter((tx) => tx.reason !== 'generation');
  const planConfig = PLANS[subscription.plan];
  const percent =
    subscription.credits_limit > 0
      ? Math.max(0, Math.min(100, (subscription.credits_remaining / subscription.credits_limit) * 100))
      : 0;

  return (
    <div className="space-y-4">
      {/* Sekme başlıkları — üç ana bölüm, aynı anda yalnız biri görünür */}
      <div className="grid grid-cols-3 gap-1.5 bg-gray-100 rounded-xl p-1.5" role="tablist">
        {BOLUMLER.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={bolum === b.id}
            onClick={() => setBolum(b.id)}
            className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              bolum === b.id
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {b.etiket}
          </button>
        ))}
      </div>

      {/* ═══ SEKME 1: Paketim — mevcut durum + bekleyen talep + paketin özellikleri ═══ */}
      {bolum === 'paketim' && (
        <>
          {/* 1. Durum kartı */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-gray-500 mb-1">Mevcut Paket</p>
                <h2 className="text-2xl font-bold text-gray-900">{planConfig.name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {subscription.credits_remaining > 0 ? (
                    'Krediler her gün yenilenir — geri sayım kredi bitince başlar'
                  ) : (
                    <>
                      Yenilenme: {formatDate(subscription.period_end)} ·{' '}
                      <QuotaCountdown
                        periodEnd={subscription.period_end}
                        className="font-medium text-purple-600"
                      />
                    </>
                  )}
                </p>
                {/* Ücretli planın satın alma bitişi (paid_until). "Yenilenme" = günlük
                    kredi dönemi (period_end) etiketiyle karışmasın — ayrı satır. */}
                {subscription.plan !== 'free' && subscription.paid_until && (
                  <p className="text-sm text-gray-600 mt-0.5">
                    Paket Bitiş:{' '}
                    <span className="font-medium text-gray-800">
                      {formatDate(subscription.paid_until)}
                    </span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-purple-600">
                  {subscription.credits_remaining}
                </p>
                <p className="text-sm text-gray-500">/ {subscription.credits_limit} AI kredisi</p>
              </div>
            </div>

            {/* Kredi progress bar */}
            <div className="mt-4">
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percent <= 10 ? 'bg-red-500' : percent <= 30 ? 'bg-orange-400' : 'bg-purple-600'
                  }`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
              {subscription.credits_remaining <= 0 && (
                <div className="mt-2 text-sm text-red-600">
                  <p>
                    {subscription.plan === 'free'
                      ? 'Günlük AI krediniz doldu — soru çözmeye devam edebilirsiniz, yenilenmesine kalan: '
                      : 'AI krediniz tükendi — soru çözmeye devam edebilirsiniz, yenilenmesine kalan: '}
                    <QuotaCountdown
                      periodEnd={subscription.period_end}
                      className="font-bold text-red-700"
                    />
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    veya AI Üst Beyin kredinizi paket yükselterek artırabilirsiniz.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Bekleyen talep kartı */}
          {pending_claim && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <div>
                  <h3 className="font-semibold text-amber-800">Ödeme talebiniz onay bekliyor</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    {PLANS[pending_claim.plan].name} paketi için oluşturduğunuz talep inceleniyor.
                    Onaydan sonra paketiniz ve kredileriniz anında aktif olur.
                    {pending_claim.created_at && ` (Talep: ${formatDateTime(pending_claim.created_at)})`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Paketinin özellikleri — açıklayıcı dille */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Paketinin Özellikleri</h3>
            <p className="text-xs text-gray-500 mb-4">{planConfig.description}</p>
            <ul className="space-y-4">
              {planConfig.features.map((feature, i) => {
                const aciklama = ozellikAciklamasi(feature);
                return (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{feature}</p>
                      {aciklama && <p className="text-xs text-gray-500 mt-0.5">{aciklama}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* ═══ SEKME 2: Paketler — satış vitrini, tam genişlik ═══ */}
      {bolum === 'paketler' && (
        <>
          {subscription.plan === 'premium' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
              <svg
                className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <p className="text-sm text-green-800">
                Şu an <span className="font-semibold">en üst pakettesiniz</span> — Premium AI
                Koçluk. Tüm özelliklere erişiyorsunuz.
              </p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {(['pro', 'premium'] as PaidPlanId[]).map((id) => {
              const config = PLANS[id];
              const mevcutPaket = id === subscription.plan;
              const dusukPaket = id === 'pro' && subscription.plan === 'premium';
              return (
                <div
                  key={id}
                  className={`bg-white rounded-2xl p-5 ${
                    config.highlighted ? 'border-2 border-purple-500 shadow-lg' : 'border border-gray-200'
                  }`}
                >
                  <h4 className="text-base font-bold text-gray-900">{config.name}</h4>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    ₺{config.price}
                    <span className="text-sm font-normal text-gray-500 ml-1">/ ay</span>
                  </p>
                  <ul className="mt-2 space-y-1.5 mb-4">
                    {config.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg
                          className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {mevcutPaket ? (
                    <span className="block text-center text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      ✓ Mevcut Paketiniz
                    </span>
                  ) : dusukPaket ? (
                    <span className="block text-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      Mevcut paketinizin altında kalır
                    </span>
                  ) : (
                    <Button
                      variant={config.highlighted ? 'primary' : 'outline'}
                      size="sm"
                      fullWidth
                      onClick={() => onUpgrade(id)}
                    >
                      Bu Pakete Geç
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ SEKME 3: Geçmiş Kullanımlarım — kredi hareketleri, tam genişlik ═══ */}
      {bolum === 'gecmis' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Kredi Hareketleri</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">Gösterilecek kredi hareketi yok.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto pr-2 thin-scrollbar">
              <ul className="divide-y divide-gray-100">
                {history.map((tx) => (
                  <li key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{REASON_LABELS[tx.reason]}</p>
                      {tx.created_at && (
                        <p className="text-xs text-gray-500">{formatDateTime(tx.created_at)}</p>
                      )}
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        tx.amount > 0 ? 'text-green-600' : 'text-gray-700'
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================================
// UpgradeModal — 3 adımlı manuel ödeme akışı
// 1) Havale talimatı (kopyala) → 2) Talep formu → 3) Gönderim + onay ekranı
// ===================================

interface UpgradeModalProps {
  plan: PaidPlanId;
  onClose: () => void;
  onClaimed: () => void; // talep oluşturulunca (liste yenileme için)
}

export function UpgradeModal({ plan, onClose, onClaimed }: UpgradeModalProps) {
  const [step, setStep] = useState<'payment' | 'form' | 'done'>('payment');
  const [senderName, setSenderName] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const config = PLANS[plan];

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Pano erişimi yoksa sessizce yut (kullanıcı elle kopyalayabilir)
    }
  };

  const submitClaim = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await authFetch('/api/subscription/claim', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          sender_name: senderName,
          reference_note: referenceNote,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || 'Talep oluşturulamadı. Lütfen tekrar deneyin.');
        return;
      }
      setStep('done');
      onClaimed();
    } catch {
      setError('Talep oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Kapat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 'payment' && (
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {config.name} — ₺{config.price}/ay
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Aşağıdaki hesaba havale/EFT ile ödemenizi yapın. Açıklama kısmına e-posta adresinizi yazmayı unutmayın.
            </p>

            <div className="mt-4 space-y-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Banka</p>
                <p className="text-sm font-medium text-gray-900">{PAYMENT_INFO.bankName}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Hesap Sahibi</p>
                <p className="text-sm font-medium text-gray-900">{PAYMENT_INFO.accountName}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">IBAN</p>
                  <p className="text-sm font-medium text-gray-900 break-all">{PAYMENT_INFO.iban}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copy(PAYMENT_INFO.iban, 'iban')}>
                  {copied === 'iban' ? 'Kopyalandı' : 'Kopyala'}
                </Button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">Tutar</p>
                  <p className="text-sm font-medium text-gray-900">₺{config.price}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copy(String(config.price), 'amount')}>
                  {copied === 'amount' ? 'Kopyalandı' : 'Kopyala'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">{PAYMENT_INFO.descriptionNote}</p>
            </div>

            <div className="mt-6">
              <Button variant="primary" size="lg" fullWidth onClick={() => setStep('form')}>
                Ödemeyi Yaptım — Talep Oluştur
              </Button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div>
            <h3 className="text-xl font-bold text-gray-900">Ödeme Talebi Bilgileri</h3>
            <p className="text-sm text-gray-600 mt-1">
              Talebinizi hızlandırmak için ödeme bilgilerini paylaşın.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gönderen Ad Soyad
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Havaleyi yapan kişi"
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama / Not (opsiyonel)
                </label>
                <textarea
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="İşlem referans no, tarih vb."
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button variant="outline" size="md" onClick={() => setStep('payment')}>
                Geri
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={submitClaim}
                disabled={submitting || senderName.trim().length === 0}
              >
                {submitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Talebiniz Alındı</h3>
            <p className="text-sm text-gray-600 mt-2">
              Ödemeniz kontrol edildikten sonra {config.name} paketiniz aktif edilecek.
              Onay genellikle kısa sürede tamamlanır.
            </p>
            <div className="mt-6">
              <Button variant="primary" size="md" fullWidth onClick={onClose}>
                Tamam
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
