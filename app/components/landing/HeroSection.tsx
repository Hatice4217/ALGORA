'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { DemoModal } from './DemoModal';

// Hero'daki statik soru kartı — üründeki gerçek formatı birebir yansıtır
// (ÖSYM 5 şık + seçili cevap + Sokratik ipucu butonu). DemoModal'daki
// demo sorusuyla aynı soru kullanılır → vitrin ile demo tutarlı kalır.
const HERO_SORUSU = {
  sinav: 'TYT',
  ders: 'Matematik',
  konu: 'Oran-Orantı',
  metin: "Bir sınıftaki öğrencilerin 3/5'i kız, geri kalan 12 öğrenci erkektir. Buna göre sınıftaki toplam öğrenci sayısı kaçtır?",
  secenekler: ['24', '27', '30', '32', '36'],
  seciliIndex: 2, // C şıkkı
};

export function HeroSection() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <section className="w-full px-4 md:px-6 lg:px-8 py-14 lg:py-20">
      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12">
        <div className="lg:w-1/2">
          {/* Badge — hedef kitleyi tek bakışta anlatır */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-sm font-semibold mb-5">
            <span>✨</span> YKS 2027&apos;ye özel yapay zekâ koçun
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
            YKS (TYT/AYT/YDT) Hazırlığında
            <span className="text-purple-600"> AI Destekli</span> Öğrenme
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8">
            Kişiselleştirilmiş sorular, hedef puana göre günlük plan üreten AI Koç,
            yanlışlarını telafi ettiren Hata Sepeti ve detaylı analizlerle
            sınava en iyi şekilde hazırlan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/auth/register">
              <Button variant="primary" size="lg" fullWidth>
                Ücretsiz Başla
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => setIsDemoModalOpen(true)}
            >
              Demo İzle
            </Button>
          </div>

          {/* Demo Modal */}
          <DemoModal
            isOpen={isDemoModalOpen}
            onClose={() => setIsDemoModalOpen(false)}
          />

          {/* Güven şeridi — üründeki gerçek vaatler (soru çözmede sınır YOK) */}
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              { ikon: '♾️', etiket: 'Sınırsız soru' },
              { ikon: '💡', etiket: '3 Sokratik ipucu' },
              { ikon: '🧠', etiket: 'AI Koç' },
              { ikon: '🧺', etiket: 'Hata telafisi' },
            ].map((cip) => (
              <span
                key={cip.etiket}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700 text-sm"
              >
                <span>{cip.ikon}</span> {cip.etiket}
              </span>
            ))}
          </div>
        </div>

        {/* Gerçek ürün görüntüsü: soru kartı mockup'ı */}
        <div className="lg:w-1/2 w-full max-w-lg">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-200 rounded-2xl transform rotate-3"></div>
            <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Rozet satırı — üründeki soru modalı başlığıyla aynı yapı */}
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 flex-wrap bg-gray-50/50">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">
                  {HERO_SORUSU.sinav}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-indigo-500 text-white">
                  {HERO_SORUSU.ders}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                  {HERO_SORUSU.konu}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">
                  📚 Havuz
                </span>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm sm:text-base font-medium text-gray-800 leading-relaxed">
                  {HERO_SORUSU.metin}
                </p>

                {/* 5 şık — C seçili (üründeki seçili stil) */}
                <div className="space-y-2.5">
                  {HERO_SORUSU.secenekler.map((secenek, index) => {
                    const secili = index === HERO_SORUSU.seciliIndex;
                    return (
                      <div
                        key={index}
                        className={`w-full p-3 border rounded-xl flex items-center gap-3 ${
                          secili
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            secili
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-sm text-gray-700">{secenek}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Sokratik ipucu butonu — üründekiyle aynı mesaj */}
                <div className="pt-1">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold">
                    💡 1. İpucu Al (ücretsiz)
                  </span>
                  <p className="mt-2 text-xs text-gray-400">
                    Çözümü ifşa etmez — düşünmeyi öğretir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
