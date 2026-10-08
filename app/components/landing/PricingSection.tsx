'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { authHelpers } from '@/lib/supabase';
import { ozellikAciklamasi } from '@/types/subscription';

// Vitrin özellik listesi — PackagePanel ile aynı açıklayıcı alt metinlerle
function OzellikListesi({ ozellikler }: { ozellikler: string[] }) {
  return (
    <ul className="space-y-3 mb-8">
      {ozellikler.map((feature, index) => {
        const aciklama = ozellikAciklamasi(feature);
        return (
          <li key={index} className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <span className="text-gray-700 text-sm font-medium">{feature}</span>
              {aciklama && <p className="text-gray-500 text-xs mt-0.5">{aciklama}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PricingSection() {
  // Oturum varsa Pro/Premium CTA doğrudan Paketim'deki yükseltme akışına götürür
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    authHelpers.getCurrentUser().then(({ user }) => setIsLoggedIn(!!user));
  }, []);

  const paidCtaHref = (plan: 'pro' | 'premium') =>
    isLoggedIn ? `/dashboard?tab=package&upgrade=${plan}` : '/auth/register';

  return (
    <section id="pricing" className="w-full px-4 md:px-6 lg:px-8 py-12 min-[480px]:py-16 md:py-20">
      <h2 className="text-3xl min-[480px]:text-4xl font-bold text-center text-gray-900 mb-4">
        Fiyatlandırma
      </h2>
      <p className="text-lg min-[480px]:text-xl text-center text-gray-600 mb-10 min-[480px]:mb-14 md:mb-16">
        Size en uygun paketi seçin ve sınava hazırlanmaya başlayın
      </p>

      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-6 min-[480px]:gap-8 w-full">
        {/* Başlangıç Paketi */}
        <div
          className="bg-white border border-gray-200 rounded-2xl p-6 min-[480px]:p-8 hover:shadow-md transition-all duration-300 gpu-accel will-change-shadow flex flex-col"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Başlangıç</h3>
          <div className="mb-8">
            <span className="text-4xl font-black text-gray-900">Ücretsiz</span>
          </div>
          <OzellikListesi
            ozellikler={[
              'Havuzdan Soru Çözme: Sınırsız',
              '3 Adımlı Sokratik İpucu: Sınırsız ve Ücretsiz',
              'AI Üst Beyin Kredisi (Günlük Limit): 3 Kredi / Gün',
              'Platform arayüzüne tam erişim'
            ]}
          />
          <div className="mt-auto">
            <Link href="/auth/register">
              <Button variant="outline" size="lg" fullWidth>
                Ücretsiz Başla
              </Button>
            </Link>
          </div>
        </div>

        {/* Pro Öğrenci Paketi */}
        <div className="bg-white border-2 border-purple-500 rounded-2xl p-6 min-[480px]:p-8 shadow-lg shadow-purple-200 md:scale-105 relative flex flex-col">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
            En Çok Tercih Edilen
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2 mt-2">Pro Öğrenci</h3>
          <div className="mb-8">
            <span className="text-4xl font-black text-gray-900">₺199</span>
            <span className="text-gray-600 ml-2">/ ay</span>
          </div>
          <OzellikListesi
            ozellikler={[
              'Havuzdan Soru Çözme: Sınırsız',
              '3 Adımlı Sokratik İpucu: Sınırsız ve Ücretsiz',
              'AI Üst Beyin Kredisi (Günlük Limit): 15 Kredi / Gün',
              'Hata Teşhisi & Çeldirici Analizi (Yakında)',
              'Eksik Kapatma Takvimi — Aralıklı Tekrar (Yakında)'
            ]}
          />
          <div className="mt-auto">
            <Link href={paidCtaHref('pro')}>
              <Button variant="primary" size="lg" fullWidth>
                Pro&apos;ya Geç
              </Button>
            </Link>
          </div>
        </div>

        {/* Premium Paket */}
        <div
          className="bg-white border border-gray-200 rounded-2xl p-6 min-[480px]:p-8 hover:shadow-md transition-all duration-300 gpu-accel will-change-shadow flex flex-col min-[480px]:col-span-2 md:col-span-1"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium AI Koçluk</h3>
          <div className="mb-8">
            <span className="text-4xl font-black text-gray-900">₺499</span>
            <span className="text-gray-600 ml-2">/ ay</span>
          </div>
          <OzellikListesi
            ozellikler={[
              'Havuzdan Soru Çözme: Sınırsız',
              '3 Adımlı Sokratik İpucu: Sınırsız ve Ücretsiz',
              'AI Üst Beyin Kredisi (Günlük Limit): 30 Kredi / Gün',
              'Yapay Zeka Destekli YKS Koçu (Yakında)',
              'Detaylı Gelişim ve Zayıf Konu Analitiği (Yakında)',
              'Kaynak Yükleme & Çoklu Sentez — RAG (Yakında)',
              'AI Sınav Komutanı — Yol Haritası (Yakında)'
            ]}
          />
          <div className="mt-auto">
            <Link href={paidCtaHref('premium')}>
              <Button variant="primary" size="lg" fullWidth>
                Premium&apos;a Geç
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}