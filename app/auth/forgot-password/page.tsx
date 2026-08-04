'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { validateEmail, sanitizeInput } from '@/lib/security';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
  });
  const [errors, setErrors] = useState<{
    email?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitized = sanitizeInput(value);
    setFormData((prev) => ({ ...prev, [name]: sanitized }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const showFieldError = (fieldName: string, message: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: message }));

    // Add shake animation to input
    const inputElement = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
    if (inputElement) {
      inputElement.classList.add('animate-shake');
      setTimeout(() => {
        inputElement.classList.remove('animate-shake');
      }, 500);
    }
  };

  const validateForm = () => {
    let hasError = false;

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      showFieldError('email', emailValidation.error!);
      hasError = true;
    }

    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous message
    setFormMessage({ type: null, text: '' });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Supabase password reset would go here
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Show success message bar
      setFormMessage({
        type: 'success',
        text: 'Şifre sıfırlama bağlantısı gönderildi. E-postanızı kontrol edin.'
      });

      // Redirect to login after success
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (error) {
      // Show error message bar
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
      {/* Back to Home Link */}
      <Link
        href="/"
        className="absolute top-4 left-6 text-gray-600 hover:text-purple-600 transition-colors text-sm font-medium flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Ana Sayfa
      </Link>

      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        {/* Forgot Password Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Şifremi Unuttum
          </h1>
          <p className="text-gray-600 mb-6 text-sm">
            E-posta adresinizi girin, şifre sıfırlama bağlantısını size gönderelim
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="E-posta"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ornek@email.com"
              autoComplete="email"
              error={errors.email}
              required
              maxLength={254}
            />

            {/* Message Bar */}
            {formMessage.type && (
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                ${formMessage.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
                }
              `}>
                {formMessage.type === 'success' ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
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
              Şifre Sıfırlama Bağlantısı Gönder
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              ← Giriş Sayfasına Dön
            </Link>
          </div>
        </div>

        <p className="text-center text-gray-600 mt-4 text-sm">
          Hesabın yok mu?{' '}
          <Link href="/auth/register" className="text-purple-600 hover:text-purple-700 font-medium">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}