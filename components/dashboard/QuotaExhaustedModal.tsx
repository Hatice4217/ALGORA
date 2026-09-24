'use client';

import { Button } from '@/app/components/ui/Button';
import { PLANS } from '@/types/subscription';
import { PLAN_LIMITS } from '@/lib/subscription-config';
import { QuotaCountdown } from './QuotaCountdown';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

interface QuotaExhaustedModalProps {
  periodEnd: string | null;
  onClose: () => void;
  onUpgrade: () => void; // ödeme akışını (UpgradeModal) açar
}

// Kota bitişinde ÖNCE bu bilgilendirme ekranı açılır; ödeme sayfası yalnızca
// kullanıcı "Pro'ya Yükselt" dediğinde açılır (doğrudan satış baskısı yok).
export function QuotaExhaustedModal({ periodEnd, onClose, onUpgrade }: QuotaExhaustedModalProps) {
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-purple-600"
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
          </div>

          <h3 className="text-xl font-bold text-gray-900">Günlük Soru Hakkınız Doldu</h3>
          <p className="text-sm text-gray-600 mt-2">
            Bugünlük {PLAN_LIMITS.free} soru üretim hakkınızın tamamını kullandınız.
          </p>
        </div>

        {/* Yenilenme bilgisi */}
        <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            ></path>
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {periodEnd
                ? `Soru hakkınız ${formatDate(periodEnd)} tarihinde yenilenecek`
                : 'Soru hakkınız yarın yenilenecek'}
            </p>
            {periodEnd && (
              <p className="text-2xl font-bold text-purple-600 mt-1.5">
                <QuotaCountdown periodEnd={periodEnd} />
              </p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">
              Yenilenme otomatiktir, ekstra bir işlem yapmanıza gerek yok.
            </p>
          </div>
        </div>

        {/* Yükseltme seçeneği */}
        <div className="mt-5 text-center">
          <p className="text-sm text-gray-600">
            Beklemek istemiyor musunuz? {PLANS.pro.name} paketine geçerek hemen{' '}
            <span className="font-semibold text-gray-800">ayda {PLAN_LIMITS.pro} soru</span> hakkı
            kazanmaya devam edin.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="lg" fullWidth onClick={onUpgrade}>
              {PLANS.pro.name} Paketine Geç — ₺{PLANS.pro.price}/ay
            </Button>
          </div>
          <button
            onClick={onClose}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Yarın devam edeceğim
          </button>
        </div>
      </div>
    </div>
  );
}
