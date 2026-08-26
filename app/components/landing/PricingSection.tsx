'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';

export function PricingSection() {
  return (
    <section id="pricing" className="w-full px-4 md:px-6 lg:px-8 py-20">
      <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
        Fiyatlandırma
      </h2>
      <p className="text-xl text-center text-gray-600 mb-16">
        Size en uygun paketi seçin ve sınava hazırlanmaya başlayın
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {/* Başlangıç Paketi */}
        <div
          className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-all duration-300 gpu-accel will-change-shadow"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Başlangıç</h3>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Sistemi keşfetmek ve yapay zekanın gücünü test etmek isteyenler için.
          </p>
          <div className="mb-8">
            <span className="text-4xl font-black text-gray-900">Ücretsiz</span>
          </div>
          <ul className="space-y-4 mb-8">
            {[
              'Aylık sınırlı AI soru çözüm kredisi',
              'Temel seviye ilerleme takibi',
              'Platform arayüzüne tam erişim'
            ].map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-700 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Link href="/auth/register">
            <Button variant="outline" size="lg" fullWidth>
              Ücretsiz Başla
            </Button>
          </Link>
        </div>

        {/* Pro Öğrenci Paketi */}
        <div className="bg-white border-2 border-purple-500 rounded-2xl p-8 shadow-lg shadow-purple-200 scale-105 relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
            En Çok Tercih Edilen
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2 mt-2">Pro Öğrenci</h3>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Düzenli çalışan ve eksiklerini nokta atışı görmek isteyen öğrenciler için optimize edilmiştir.
          </p>
          <div className="mb-8">
            <span className="text-4xl font-black text-gray-900">₺199</span>
            <span className="text-gray-600 ml-2">/ ay</span>
          </div>
          <ul className="space-y-4 mb-8">
            {[
              'Aylık 1000 AI soru/token kredisi',
              'Detaylı yapay zeka konu ve eksik analizi',
              'Geçmişe dönük performans ve ilerleme grafikleri',
              'Aylık standart gelişim raporu'
            ].map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-700 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Link href="/auth/register">
            <Button variant="primary" size="lg" fullWidth>
              Pro'ya Geç
            </Button>
          </Link>
        </div>

        {/* Premium Paket */}
        <div
          className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-all duration-300 gpu-accel will-change-shadow"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium AI Koçluk</h3>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Sınav sürecinde bir rehbere ihtiyaç duyan ve sınırları kaldırmak isteyenler için.
          </p>
          <div className="mb-8">
            <span className="text-4xl font-black text-gray-900">₺499</span>
            <span className="text-gray-600 ml-2">/ ay</span>
          </div>
          <ul className="space-y-4 mb-8">
            {[
              'Sınırsız (Adil kullanım kotalı) AI etkileşimi',
              'Yapay Zeka Koçluk Sistemi (Haftalık çalışma programı)',
              'Anlık rota hesaplama ve motivasyon bildirimleri',
              'Veliler için haftalık detaylı e-posta raporları'
            ].map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-700 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Link href="/auth/register">
            <Button variant="primary" size="lg" fullWidth>
              Premium'a Geç
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}