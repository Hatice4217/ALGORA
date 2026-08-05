'use client';

import React, { useState } from 'react';
import {
  LogoLightning,
  LogoGradientWave,
  LogoHexagon,
  LogoWordmark,
  LogoAIBrain
} from '../components/ui/logos';

export default function LogoPreviewPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);

  const logos = [
    {
      id: 'ai-brain',
      name: 'AI + Beyin Teması',
      description: '🧠 Beyin ikonu + A harfi kombinasyonu',
      component: LogoAIBrain,
      color: 'from-purple-600 to-blue-600'
    },
    {
      id: 'lightning',
      name: 'Yıldırım Logosu',
      description: '⚡ Yıldırım + A harfi hexagon içinde',
      component: LogoLightning,
      color: 'from-purple-600 to-purple-800'
    },
    {
      id: 'gradient-wave',
      name: 'Gradient Dalga',
      description: '🌊 Modern gradient dalga efekti',
      component: LogoGradientWave,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'hexagon',
      name: 'Hexagon Geometric',
      description: '⬡ SVG hexagon + tech detayları',
      component: LogoHexagon,
      color: 'from-purple-600 to-purple-800'
    },
    {
      id: 'wordmark',
      name: 'Wordmark Minimal',
      description: '✨ Notion/Linear tarzı yazı logosu',
      component: LogoWordmark,
      color: 'from-purple-500 to-purple-700'
    }
  ];

  const sizes: Array<{ value: 'sm' | 'md' | 'lg'; label: string }> = [
    { value: 'sm', label: 'Küçük' },
    { value: 'md', label: 'Orta' },
    { value: 'lg', label: 'Büyük' }
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-blue-50'}`}>
      {/* Header */}
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ALGORA Logo Seçimi
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Beğendiğiniz logoyu seçin
            </p>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>

        {/* Size Selector */}
        <div className="mb-8">
          <h2 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Logo Boyutu
          </h2>
          <div className="flex gap-2">
            {sizes.map((size) => (
              <button
                key={size.value}
                onClick={() => setSelectedSize(size.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedSize === size.value
                    ? 'bg-purple-600 text-white'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {logos.map((logo) => {
            const LogoComponent = logo.component;
            const isSelected = selectedLogo === logo.id;

            return (
              <div
                key={logo.id}
                onClick={() => setSelectedLogo(logo.id)}
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected
                    ? 'border-purple-500 ring-4 ring-purple-200 dark:ring-purple-900'
                    : isDarkMode
                    ? 'border-gray-700 bg-gray-800 hover:border-purple-600'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    ✓
                  </div>
                )}

                {/* Logo Preview */}
                <div className="flex items-center justify-center mb-4 min-h-[80px]">
                  <LogoComponent
                    size={selectedSize}
                    showText={true}
                  />
                </div>

                {/* Logo Info */}
                <div className="text-center">
                  <h2 className={`font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {logo.name}
                  </h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {logo.description}
                  </p>
                </div>

                {/* Color Preview */}
                <div className={`mt-4 h-2 rounded-full bg-gradient-to-r ${logo.color}`} />
              </div>
            );
          })}
        </div>

        {/* Selected Logo Display */}
        {selectedLogo && (
          <div className={`p-8 rounded-xl border-2 ${
            isDarkMode ? 'bg-gray-800 border-purple-600' : 'bg-white border-purple-300'
          } mb-8`}>
            <h2 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Seçilen Logo - Büyük Önizleme
            </h2>
            <div className="flex items-center justify-center py-8">
              {(() => {
                const selectedLogoData = logos.find(l => l.id === selectedLogo);
                if (!selectedLogoData) return null;
                const LogoComponent = selectedLogoData.component;
                return <LogoComponent size="lg" showText={true} />;
              })()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Seçiminizi yapıp geliştiriciye bildirin
          </p>
        </div>
      </main>
    </div>
  );
}