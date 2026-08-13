'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Body scroll lock when menu is open - Optimized to prevent forced reflow
  useEffect(() => {
    // Use requestAnimationFrame to batch DOM updates and prevent forced reflow
    requestAnimationFrame(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close menu on route change (App Router compatible)
  useEffect(() => {
    // Close menu when route changes
    onClose();
  }, [pathname]);

  const handleLinkClick = (href: string) => {
    onClose();
    // Smooth scroll to section if it's an anchor link - Optimized to prevent forced reflow
    if (href.startsWith('#')) {
      // Use requestAnimationFrame to batch DOM read and write operations
      requestAnimationFrame(() => {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden gpu-accel will-change-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl md:hidden gpu-accel will-change-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Menü</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Kapat"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Navigation Links */}
          <nav className="flex-1 px-6 py-8">
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick('#features');
                  }}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all font-medium"
                >
                  Özellikler
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick('#how-it-works');
                  }}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all font-medium"
                >
                  Nasıl Çalışır?
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick('#pricing');
                  }}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all font-medium"
                >
                  Fiyatlandırma
                </a>
              </li>
            </ul>

            {/* Divider */}
            <div className="my-6 border-t border-gray-200" />

            {/* Auth Links */}
            <ul className="space-y-2">
              <li>
                <Link
                  href="/auth/login"
                  onClick={() => handleLinkClick('/auth/login')}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all font-medium"
                >
                  Giriş Yap
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  onClick={() => handleLinkClick('/auth/register')}
                  className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all font-medium"
                >
                  Kayıt Ol
                </Link>
              </li>
            </ul>
          </nav>

          {/* Footer Info */}
          <div className="px-6 py-6 border-t border-gray-200 bg-gray-50">
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                <strong>ALGORA</strong> - AI destekli öğrenme platformu
              </p>
              <div className="flex gap-4 text-xs text-gray-500">
                <Link
                  href="/legal/privacy"
                  onClick={() => handleLinkClick('/legal/privacy')}
                  className="hover:text-purple-600 transition"
                >
                  Gizlilik
                </Link>
                <Link
                  href="/legal/terms"
                  onClick={() => handleLinkClick('/legal/terms')}
                  className="hover:text-purple-600 transition"
                >
                  Şartlar
                </Link>
                <Link
                  href="/legal/cookies"
                  onClick={() => handleLinkClick('/legal/cookies')}
                  className="hover:text-purple-600 transition"
                >
                  Çerezler
                </Link>
              </div>
              <p className="text-xs text-gray-500">
                © 2026 ALGORA. Tüm hakları saklıdır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Hamburger Menu Button Component
export function HamburgerButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`md:hidden flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-all hover:bg-gray-100 gpu-accel will-change-shadow ${
        isOpen ? 'bg-gray-100' : ''
      }`}
      aria-label={isOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
      aria-expanded={isOpen}
    >
      <span
        className={`w-6 h-0.5 bg-gray-700 rounded-full transition-all duration-300 gpu-accel will-change-transform ${
          isOpen ? 'rotate-45 translate-y-1' : ''
        }`}
      />
      <span
        className={`w-6 h-0.5 bg-gray-700 rounded-full transition-all duration-300 gpu-accel will-change-opacity ${
          isOpen ? 'opacity-0' : ''
        }`}
      />
      <span
        className={`w-6 h-0.5 bg-gray-700 rounded-full transition-all duration-300 gpu-accel will-change-transform ${
          isOpen ? '-rotate-45 -translate-y-1' : ''
        }`}
      />
    </button>
  );
}
