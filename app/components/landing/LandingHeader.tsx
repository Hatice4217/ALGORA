'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/app/components/ui/Logo';
import { Button } from '@/app/components/ui/Button';
import { MobileMenu, HamburgerButton } from '@/components/MobileMenu';

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
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
    </>
  );
}