'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/app/components/ui/Logo';
import { Button } from '@/app/components/ui/Button';
import { MobileMenu, HamburgerButton } from '@/components/MobileMenu';

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <nav className="w-full px-4 md:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Logo size="lg" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              onClick={(e) => handleSmoothScroll(e, 'features')}
              className="text-gray-600 hover:text-purple-600 transition"
            >
              Özellikler
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleSmoothScroll(e, 'how-it-works')}
              className="text-gray-600 hover:text-purple-600 transition"
            >
              Nasıl Çalışır?
            </a>
            <a
              href="#pricing"
              onClick={(e) => handleSmoothScroll(e, 'pricing')}
              className="text-gray-600 hover:text-purple-600 transition"
            >
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
    </>
  );
}