'use client';

// Hata Sepeti — Duolingo tarzı telafi merkezi. Gece vardiyası, dün yanlış
// cevaplanan soruların BENZERlerini (klon) üretir; öğrenci buradan tek tıkla
// çözer, cevaplanan klon listeden düşer. İlerleme tabanı oturumda görülen en
// yüksek klon sayısıdır (yenilemede sıfırdan başlar). Soru çözme pratiği
// Dinamik Soru Bankası'nda olduğundan "Çöz" tıklaması önce sekmeyi oraya
// çevirir, sonra klonu sıradan soru gibi açar (page.tsx klonAc).

import { useEffect, useState } from 'react';
import { getSubjectColor } from '../../lib/utils';
import type { PendingClone } from '../../types/question';

const ZORLUK_ETIKET: Record<string, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

interface HataSepetiPanelProps {
  bekleyenKlonlar: PendingClone[];
  // Klonu çözülmek üzere açar (page.tsx: sekme practiceRoom'a döner + klonAc)
  coz: (klon: PendingClone) => void;
}

export function HataSepetiPanel({ bekleyenKlonlar, coz }: HataSepetiPanelProps) {
  // Telafi ilerlemesinin tabanı: oturumda görülen en yüksek klon sayısı.
  // Cevaplanan klonlar listeden düştükçe çubuk dolar; hepsi bitince kutlama.
  const [sepetZirvesi, setSepetZirvesi] = useState(0);
  const [kutlamaKapandi, setKutlamaKapandi] = useState(false);

  useEffect(() => {
    setSepetZirvesi((eski) => Math.max(eski, bekleyenKlonlar.length));
  }, [bekleyenKlonlar]);

  const telafiEdilen = sepetZirvesi - bekleyenKlonlar.length;
  const telafiYuzdesi = sepetZirvesi > 0 ? Math.round((telafiEdilen / sepetZirvesi) * 100) : 0;
  const sepetBos = bekleyenKlonlar.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Başlık kartı — sepet durumu + telafi özeti */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 flex-wrap">
              <span className="relative inline-flex text-2xl leading-none">
                🧺
                {!sepetBos && (
                  <span className="absolute -top-1.5 -right-4 min-w-[1.4rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {bekleyenKlonlar.length}
                  </span>
                )}
              </span>
              Hata Sepeti
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Dün yanlış yaptığın soruların benzerleri sepete eklenir — telafi ettikçe boşalır,
              eksiklerin kapanır.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold shrink-0">
            {telafiEdilen}/{sepetZirvesi} telafi edildi
          </span>
        </div>

        {/* Telafi ilerleme çubuğu */}
        <div
          className="mt-4 h-3 rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={telafiYuzdesi}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Hata sepeti telafi ilerlemesi"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${telafiYuzdesi}%` }}
          />
        </div>
      </div>

      {/* 🎉 Sepet boşaltıldı — kutlama (kapatılana dek görünür) */}
      {sepetBos && sepetZirvesi > 0 && !kutlamaKapandi && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-5 py-4 flex items-start justify-between gap-3 animate-toast-in">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
              <span className="text-base">🎉</span> Hata sepetini boşalttın!
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              {sepetZirvesi} yanlışın tamamını telafi ettin — eksiklerin kapanıyor, böyle devam!
            </p>
          </div>
          <button
            onClick={() => setKutlamaKapandi(true)}
            aria-label="Kutlamayı kapat"
            className="p-1 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Sepette bekleyen klonlar — kart grid'i (CTA alta hizalı, eşit boyut) */}
      {!sepetBos && (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
          {bekleyenKlonlar.map((klon) => (
            <div
              key={klon.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${getSubjectColor(klon.subject)} text-white`}>
                  {klon.subject}
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                  {klon.exam_type}
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                  {ZORLUK_ETIKET[klon.difficulty] ?? klon.difficulty}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700 break-words line-clamp-2">
                {klon.question_text}
              </p>
              <p className="text-xs text-slate-400 truncate">📍 {klon.topic}</p>
              <button
                onClick={() => coz(klon)}
                className="mt-auto w-full px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors"
              >
                Çöz
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Boş durum — hiç telafi edilecek soru yok */}
      {sepetBos && sepetZirvesi === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <span className="text-4xl">✨</span>
          <h3 className="mt-3 text-base font-bold text-slate-800">Sepetin şimdilik temiz</h3>
          <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
            Yanlış cevapladığın soruların benzerleri gece vardiyasıyla buraya düşer. Telafi
            etmek hem konuyu pekiştirir hem de eksiklerini kapatır.
          </p>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pb-2">
        Telafi soruları Dinamik Soru Bankası&apos;nda sıradan soru gibi çözülür — ilerleme anında güncellenir.
      </p>
    </div>
  );
}
