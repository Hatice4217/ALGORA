'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { validatePassword } from '@/lib/security';
import { authHelpers, dbHelpers } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  // Kurtarma linki Supabase tarafından oturum kurar (detectSessionInUrl);
  // client init yarışına karşı kısa süre session'ı yoklarız
  useEffect(() => {
    let attempts = 0;
    const checkSession = async () => {
      const { user } = await authHelpers.getCurrentUser();
      if (user) {
        setHasRecoverySession(true);
        setSessionChecked(true);
        return;
      }
      attempts += 1;
      if (attempts < 10) {
        setTimeout(checkSession, 500);
      } else {
        setSessionChecked(true);
      }
    };
    checkSession();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    let hasError = false;

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setErrors((prev) => ({ ...prev, password: passwordValidation.error }));
      hasError = true;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Şifreler eşleşmiyor' }));
      hasError = true;
    }

    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormMessage({ type: null, text: '' });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await dbHelpers.setNewPassword(formData.password);

      if (error) {
        setFormMessage({
          type: 'error',
          text: typeof error === 'string' && error
            ? error
            : 'Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir.'
        });
        return;
      }

      // Kurtarma oturumunu kapat, kullanıcıyı girişe yönlendir
      await authHelpers.signOut();
      setFormMessage({
        type: 'success',
        text: 'Şifreniz güncellendi! Giriş sayfasına yönlendiriliyorsunuz...'
      });
      setTimeout(() => {
        router.push('/auth/login');
      }, 2500);
    } catch {
      setFormMessage({
        type: 'error',
        text: 'Bir hata oluştu. Lütfen tekrar deneyin.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-6 py-4 relative">
      <Link
        href="/"
        className="absolute top-4 left-6 text-gray-600 hover:text-purple-600 transition-colors text-sm font-medium flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Ana Sayfa
      </Link>

      <main className="max-w-md w-full">
        <div className="text-center mb-6">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {!sessionChecked && (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full animate-pulse">
                <svg className="w-8 h-8 text-purple-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Bağlantı doğrulanıyor...</h1>
            </div>
          )}

          {sessionChecked && !hasRecoverySession && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Bağlantı Geçersiz</h1>
              <p className="text-gray-600 text-sm">
                Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı talep edin.
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all"
              >
                Yeni Bağlantı Talep Et
              </Link>
            </div>
          )}

          {sessionChecked && hasRecoverySession && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Yeni Şifre Belirle
              </h1>
              <p className="text-gray-600 mb-6 text-sm">
                Hesabın için yeni bir şifre oluştur
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <Input
                  label="Yeni Şifre"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.password}
                  required
                />

                <Input
                  label="Yeni Şifre (Tekrar)"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.confirmPassword}
                  required
                />

                {formMessage.type && (
                  <div className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    ${formMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                    }
                  `}>
                    <span className="text-sm">{formMessage.text}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isLoading}
                >
                  Şifreyi Güncelle
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
