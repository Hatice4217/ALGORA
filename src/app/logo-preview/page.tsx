'use client';

import React, { useState } from 'react';
import { Logo } from '../../../app/components/ui/Logo';

export default function LogoPreviewPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [selectedVariant, setSelectedVariant] = useState<'infinity' | 'geometric-a' | 'brain-circuit' | null>(null);

  const variants = [
    {
      id: 'infinity' as const,
      name: 'Sonsuzluk Sembolü',
      description: '∞ Sürekli öğrenmeyi temsil eden sonsuzluk',
      gradient: 'from-purple-600 via-purple-500 to-pink-500',
      tech: 'Gradient akış'
    },
    {
      id: 'geometric-a' as const,
      name: 'Geometric A',
      description: '⬡ Keskin köşeli, algoritma hissi',
      gradient: 'from-purple-600 to-pink-500',
      tech: 'Tech detaylı'
    },
    {
      id: 'brain-circuit' as const,
      name: 'Beyin Devresi',
      description: '🧠 Minimalist çizgi sanatı',
      gradient: 'from-purple-600 via-purple-500 to-pink-500',
      tech: 'Devre motifleri'
    }
  ];

  const sizes: Array<{ value: 'sm' | 'md' | 'lg'; label: string }> = [
    { value: 'sm', label: 'Küçük' },
    { value: 'md', label: 'Orta' },
    { value: 'lg', label: 'Büyük' }
  ];

  const darkBg = 'bg-[#0F0F0F]';
  const lightBg = 'bg-gradient-to-br from-purple-50 via-white to-pink-50';
  const bgClass = isDarkMode ? darkBg : lightBg;

  return (
    <>
    <div className={`min-h-screen transition-colors duration-300 ${bgClass}`}>
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ALGORA Logo Tasarımları
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Yeni logo konsepti: Zeki + Güçlü + Modern
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Hedef kitle: 15-18 yaş YKS/LGS öğrencileri
            </p>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {isDarkMode ? '🌙 Dark' : '☀️ Light'}
            </span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${
                isDarkMode ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                  isDarkMode ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Renk Paleti Bilgisi */}
        <div className={`mb-8 p-4 rounded-xl border ${
          isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Renk Paleti
          </h3>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: '#7C3AED' }} />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Ana Mor #7C3AED
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: '#A855F7' }} />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Açık Mor #A855F7
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500" />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Gradient #7C3AED → #EC4899
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0F0F0F]" />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Dark Mode #0F0F0F
              </span>
            </div>
          </div>
        </div>

        {/* Size Selector */}
        <div className="mb-8">
          <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Logo Boyutu
          </h3>
          <div className="flex gap-2">
            {sizes.map((size) => (
              <button
                key={size.value}
                onClick={() => setSelectedSize(size.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedSize === size.value
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {variants.map((variant) => {
            const isSelected = selectedVariant === variant.id;

            return (
              <div
                key={variant.id}
                onClick={() => setSelectedVariant(variant.id)}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl ${
                  isSelected
                    ? 'border-purple-500 ring-4 ring-purple-200 dark:ring-purple-900 shadow-lg'
                    : isDarkMode
                    ? 'border-gray-800 bg-gray-900/50 hover:border-purple-600'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-lg'
                }`}
              >
                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    ✓
                  </div>
                )}

                {/* Logo Preview */}
                <div className="flex items-center justify-center mb-6 min-h-[100px]">
                  <Logo
                    variant={variant.id}
                    size={selectedSize}
                    showText={true}
                    darkMode={isDarkMode}
                  />
                </div>

                {/* Logo Info */}
                <div className="text-center mb-4">
                  <h3 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {variant.name}
                  </h3>
                  <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {variant.description}
                  </p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    isDarkMode ? 'bg-gray-800 text-purple-400' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {variant.tech}
                  </span>
                </div>

                {/* Gradient Preview */}
                <div className={`h-2 rounded-full bg-gradient-to-r ${variant.gradient}`} />
              </div>
            );
          })}
        </div>

        {/* Selected Logo Display */}
        {selectedVariant && (
          <div className={`p-10 rounded-2xl border-2 transition-all ${
            isDarkMode
              ? 'bg-gray-900 border-purple-600 shadow-2xl shadow-purple-900/50'
              : 'bg-white border-purple-300 shadow-xl shadow-purple-200'
          } mb-8`}>
            <h3 className={`text-xl font-bold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Seçilen Logo - Önizleme
            </h3>

            <div className="flex items-center justify-center gap-12 py-8">
              {/* Light Mode Preview */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-3">Light Mode</p>
                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-gray-200">
                  <Logo
                    variant={selectedVariant}
                    size="lg"
                    showText={true}
                    darkMode={false}
                  />
                </div>
              </div>

              {/* Dark Mode Preview */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-3">Dark Mode</p>
                <div className="p-6 rounded-xl bg-[#0F0F0F] border border-gray-800">
                  <Logo
                    variant={selectedVariant}
                    size="lg"
                    showText={true}
                    darkMode={true}
                  />
                </div>
              </div>
            </div>

            {/* Color Breakdown */}
            <div className={`mt-8 p-6 rounded-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <h4 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Seçilen Logo Özellikleri
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}>{'İkon: '}</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'} font-medium>
                    {variants.find(v => v.id === selectedVariant)?.name}
                  </span>
                </div>
                <div>
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}}>Tagline: </span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'} font-medium">
                    AI ile Öğren
                  </span>
                </div>
                <div>
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}}>Ana Renk: </span>
                  <span className="font-medium" style={{ color: '#7C3AED' }}>
                    #7C3AED
                  </span>
                </div>
                <div>
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600'}}>Gradient: </span>
                  <span className="font-medium bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                    #7C3AED → #EC4899
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className={`text-sm ${isDarkMode ? 'text-gray-600' : 'text-gray-500'}`}>
            Beğendiğiniz logoyu seçin ve geliştiriciye bildirin
          </p>
          <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-700' : 'text-gray-400'}`}>
            Konsept: Zeki + Güçlü + İkon ve yazı kombinasyonu
          </p>
        </div>
      </div>
    </div>
    </div>
    </>
  );
}