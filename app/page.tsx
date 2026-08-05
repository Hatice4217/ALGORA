'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from './components/ui/Button';
import { Logo } from './components/ui/Logo';
import { Footer } from '../components/Footer';
import { MobileMenu, HamburgerButton } from '../components/MobileMenu';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Logo size="lg" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-purple-600 transition">
              Özellikler
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-purple-600 transition">
              Nasıl Çalışır?
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-purple-600 transition">
              Fiyatlandırma
            </a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="md">
                Giriş Yap
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="primary" size="md">
                Ücretsiz Başla
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <HamburgerButton
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isOpen={isMobileMenuOpen}
          />
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main>
        {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              YKS ve LGS Hazırlığında
              <span className="text-purple-600"> AI Destekli</span> Öğrenme
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Yapay zeka destekli kişiselleştirilmiş sorular, detaylı analizler ve
              sürekli ilerleme takibi ile sınavlara en iyi şekilde hazırlan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/auth/register">
                <Button variant="primary" size="lg" fullWidth>
                  Ücretsiz Başla
                </Button>
              </Link>
              <Button variant="outline" size="lg" fullWidth>
                Demo İzle
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-purple-200 border-2 border-white shadow-sm"
                  />
                ))}
              </div>
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">500+</span> öğrenci
                hazırlanıyor
              </p>
            </div>
          </div>
          <div className="lg:w-1/2">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-200 rounded-2xl transform rotate-3"></div>
              <div className="relative bg-white rounded-2xl shadow-xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📚</span>
                    </div>
                    <div>
                      <h2 className="font-semibold">Kişiselleştirilmiş Sorular</h2>
                      <p className="text-sm text-gray-600">Seviyene uygun sorular</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div>
                      <h2 className="font-semibold">Detaylı Analiz</h2>
                      <p className="text-sm text-gray-600">İlerleme takibi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <div>
                      <h2 className="font-semibold">Hedef Odaklı</h2>
                      <p className="text-sm text-gray-600">TYT, AYT, LGS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Neden ALGORA? Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-10">
          Neden ALGORA?
        </h2>
        <p className="text-xl text-center text-gray-600 mt-4 mb-16">
          Sınav hazırlığında yapay zeka destekli öğrenme deneyimi
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[
            {
              number: '01',
              title: 'Nokta Atışı Analiz',
              description: 'Bildiğin konularla vakit kaybetme. Yapay zekamız eksiklerini anında tespit eder ve sadece ihtiyacın olan soruları karşına çıkarır.'
            },
            {
              number: '02',
              title: 'Maksimum Zaman Tasarrufu',
              description: 'Geleneksel soru bankalarında kaybolma. Sana özel optimize edilmiş analizlerle gereksiz tekrarlardan kurtul.'
            },
            {
              number: '03',
              title: 'Hedef Odaklı İlerleme',
              description: 'Yüzlerce sayfa arasında ne çalışacağını düşünme. Algora hedefini belirler, sana sadece masaya oturup netlerini artırmak kalır.'
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 hover:-translate-y-1 cursor-default"
            >
              {/* Rakam - Sol Üst Köşede */}
              <div className="text-purple-600 text-6xl font-black mb-4 leading-none">
                {feature.number}
              </div>

              {/* Başlık */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>

              {/* Metin */}
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-6 py-20 bg-purple-50 rounded-3xl mb-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Nasıl Çalışır?
        </h2>
        <div className="relative">
          {/* Mobil için dikey çizgi */}
          <div className="md:hidden absolute left-8 top-8 bottom-8 w-0.5 border-l-2 border-dashed border-purple-300 z-0"></div>

          {/* Masaüstü için yatay çizgi */}
          <div className="hidden md:block absolute top-8 left-[8%] right-[8%] h-0.5 border-t-2 border-dashed border-purple-300 z-0"></div>

          <div className="grid md:grid-cols-4 gap-8 relative z-10">
            {[
              {
                step: '1',
                title: 'Kayıt Ol',
                description: 'Ücretsiz hesabınızı oluşturun',
              },
              {
                step: '2',
                title: 'Sınav Seç',
                description: 'TYT, AYT veya LGS seçin',
              },
              {
                step: '3',
                title: 'Çöz & Öğren',
                description: 'Kişiselleştirilmiş soruları çözün',
              },
              {
                step: '4',
                title: 'Hedefine Ulaş',
                description: 'Detaylı analizlerle eksiklerini kapat ve başarıya odaklan.',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white border-4 border-purple-400 rounded-full flex items-center justify-center text-purple-600 text-2xl font-bold mx-auto mb-4 shadow-sm">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
          Fiyatlandırma
        </h2>
        <p className="text-xl text-center text-gray-600 mb-16">
          Size en uygun paketi seçin ve sınava hazırlanmaya başlayın
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Başlangıç Paketi */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-all duration-300">
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
            {/* Badge */}
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
          <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-all duration-300">
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
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
