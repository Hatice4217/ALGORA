'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/app/components/ui/Logo';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Geçersiz onay linki. Lütfen tekrar giriş yapmayı deneyin.');
        return;
      }

      try {
        // Debug: Log the raw token
        console.log('🔍 Raw token:', token);
        console.log('🔍 Token length:', token.length);

        // Decode token (simple email token)
        const email = atob(token);
        console.log('✅ Decoded email:', email);

        // For demo purposes, we'll redirect to login with success message
        // In production, you would make an API call to verify the email
        setTimeout(() => {
          setStatus('success');
          setMessage('E-posta adresiniz başarıyla onaylandı! Şimdi giriş yapabilirsiniz.');

          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push(`/auth/login?email=${encodeURIComponent(email)}&verified=true`);
          }, 3000);
        }, 1500);

      } catch (error) {
        console.error('Verify email error:', error);
        setStatus('error');
        setMessage('Onay işleminde bir hata oluştu. Lütfen tekrar deneyin.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/">
              <Logo size="lg" />
            </Link>
          </div>

          {/* Verification Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {status === 'loading' && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full animate-pulse">
                  <svg className="w-8 h-8 text-purple-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  E-posta Onaylanıyor...
                </h2>
                <p className="text-gray-600">
                  Lütfen bekleyin, e-posta adresiniz kontrol ediliyor.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Başarılı! 🎉
                </h2>
                <p className="text-gray-600">
                  {message}
                </p>
                <p className="text-sm text-gray-500">
                  Giriş sayfasına yönlendiriliyorsunuz...
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Hata Oluştu
                </h2>
                <p className="text-gray-600">
                  {message}
                </p>
                <div className="pt-4 flex flex-col gap-3">
                  <Link
                    href="/auth/register"
                    className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all"
                  >
                    Tekrar Kayıt Ol
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                  >
                    Giriş Sayfasına Git
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function VerifyEmailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full animate-pulse">
              <svg className="w-8 h-8 text-purple-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-4">
              Yükleniyor...
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
