'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authHelpers } from '@/lib/supabase';
import { Logo } from '../../components/ui/Logo';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          setStatus('error');
          setErrorMessage(errorDescription || 'Google ile giriş işlemi başarısız oldu');
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        // Check if there's an access token in the URL hash (OAuth flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken || code) {
          // Supabase will handle the session automatically
          // Wait for the session to be established
          await new Promise(resolve => setTimeout(resolve, 1000));

          const { user, error: sessionError } = await authHelpers.getCurrentUser();

          if (sessionError || !user) {
            setStatus('error');
            setErrorMessage('Oturum oluşturulamadı. Lütfen tekrar deneyin.');
            setTimeout(() => router.push('/auth/login'), 3000);
            return;
          }

          setStatus('success');
          // Check if user has completed onboarding
          // For now, redirect to dashboard
          setTimeout(() => router.push('/dashboard'), 1000);
        } else {
          setStatus('error');
          setErrorMessage('Geçersiz OAuth callback');
          setTimeout(() => router.push('/auth/login'), 3000);
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
        setTimeout(() => router.push('/auth/login'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="lg" />
        </div>

        {/* Status Messages */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {status === 'loading' && (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Giriş Yapılıyor...
              </h2>
              <p className="text-gray-600">
                Lütfen bekleyin, sizi yönlendiriyoruz.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Giriş Başarılı!
              </h2>
              <p className="text-gray-600">
                Dashboard'a yönlendiriliyorsunuz...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Giriş Başarısız
              </h2>
              <p className="text-gray-600 mb-4">
                {errorMessage}
              </p>
              <p className="text-sm text-gray-500">
                Giriş sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
