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
    // O4 fix: tüm setTimeout'lar kayıt altında — bileşenUnmount olursa temizlenir
    // (ölü bileşen üstünde push/state uyarısı olmasın) ve sabit 1 sn oturum-bekleme
    // yerine SINIRLI POLLING yapılır (yavaş ağda hash işlenmeden hata vermesein)
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };
    let iptal = false;

    const handleCallback = async () => {
      try {
        // Get the URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          setStatus('error');
          const errorMsg = errorDescription || error || 'Google ile giriş işlemi başarısız oldu';
          setErrorMessage(`${errorMsg} (Hata kodu: ${error})`);
          console.error('Google OAuth Error:', { error, errorDescription });
          later(() => router.push('/auth/login'), 5000);
          return;
        }

        // Check if there's an access token in the URL hash (OAuth flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken || code) {
          // Supabase hash'i otomatik işler (detectSessionInUrl); oturum yerel depoya
          // yazılana kadar 350 ms aralıklarla, en çok ~5 sn (15 deneme) beklenir
          let user = null as null | { id: string };
          for (let deneme = 0; deneme < 15; deneme++) {
            const r = await authHelpers.getCurrentUser();
            if (!r.error && r.user) {
              user = r.user;
              break;
            }
            if (iptal) return;
            await new Promise((res) => setTimeout(res, 350));
          }

          if (!user) {
            setStatus('error');
            setErrorMessage('Oturum oluşturulamadı. Lütfen tekrar deneyin.');
            later(() => router.push('/auth/login'), 3000);
            return;
          }

          setStatus('success');
          // Google kullanıcısı dahil herkes doğrudan Dinamik Soru Bankası'na (onboarding kaldırıldı)
          later(() => router.push('/dashboard'), 1000);
        } else {
          setStatus('error');
          setErrorMessage('Geçersiz OAuth callback');
          later(() => router.push('/auth/login'), 3000);
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
        later(() => router.push('/auth/login'), 3000);
      }
    };

    handleCallback();
    return () => {
      iptal = true;
      timers.forEach(clearTimeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-6">
      <main className="max-w-md w-full text-center">
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
                Dashboard&apos;a yönlendiriliyorsunuz...
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
      </main>
    </div>
  );
}
