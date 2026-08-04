'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authHelpers } from '@/lib/supabase';
import { Logo } from '../../components/ui/Logo';
import {
  validateEmail,
  validatePassword,
  validateName,
  checkPasswordStrength,
  sanitizeInput
} from '@/lib/security';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: 'weak' | 'medium' | 'strong';
    score: number;
    feedback: string[];
    requirements: { met: boolean; text: string }[];
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitized = sanitizeInput(value);
    setFormData((prev) => ({ ...prev, [name]: sanitized }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Update password strength in real-time
    if (name === 'password' && sanitized) {
      setPasswordStrength(checkPasswordStrength(sanitized));
    } else if (name === 'password' && !sanitized) {
      setPasswordStrength(null);
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

    // Validate name
    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) {
      showFieldError('name', nameValidation.error!);
      hasError = true;
    }

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      showFieldError('email', emailValidation.error!);
      hasError = true;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      showFieldError('password', passwordValidation.error!);
      hasError = true;
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      showFieldError('confirmPassword', 'Lütfen şifrenizi tekrar girin');
      hasError = true;
    } else if (formData.password !== formData.confirmPassword) {
      showFieldError('confirmPassword', 'Şifreler eşleşmiyor');
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
      const { data, error } = await authHelpers.signUp(
        formData.email,
        formData.password,
        formData.name
      );

      if (error) {
        if (error.message.includes('already registered')) {
          setFormMessage({
            type: 'error',
            text: 'Bu e-posta adresi zaten kullanımda'
          });
        } else {
          setFormMessage({
            type: 'error',
            text: 'Kayıt başarısız. Lütfen tekrar deneyin.'
          });
        }
        return;
      }

      // Show success message
      setFormMessage({
        type: 'success',
        text: '🎉 Kayıt başarılı! Hoş geldiniz'
      });

      // Redirect to onboarding after success
      setTimeout(() => {
        router.push('/onboarding');
      }, 2500);
    } catch (error) {
      setFormMessage({
        type: 'error',
        text: 'Bir hata oluştu. Lütfen tekrar deneyin.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await authHelpers.signInWithGoogle();
      if (error) {
        setFormMessage({ type: 'error', text: 'Google ile kayıt başarısız' });
        setIsLoading(false);
      }
    } catch (error) {
      setFormMessage({ type: 'error', text: 'Bir hata oluştu' });
      setIsLoading(false);
    }
  };

  // Password strength colors
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak': return 'Zayıf';
      case 'medium': return 'Orta';
      case 'strong': return 'Güçlü';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-4 relative">
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

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Algora'ya Hoş Geldin 🎉
          </h1>
          <p className="text-gray-600 mb-4 text-sm">
            Ücretsiz hesabını oluştur ve sınav hazırlığına başla
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Ad Soyad */}
            <Input
              label="Ad Soyad"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ahmet Yılmaz"
              autoComplete="name"
              error={errors.name}
              required
              maxLength={100}
            />

            {/* E-posta */}
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

            {/* Şifre ve Şifre Tekrarı - Yan Yana */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Şifre */}
              <div>
                <Input
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                  error={errors.password}
                  required
                  maxLength={128}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  }
                  onRightIconClick={() => setShowPassword(!showPassword)}
                />
              </div>

              {/* Şifre Tekrarı */}
              <Input
                label="Şifre Tekrarı"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Şifrenizi tekrar girin"
                autoComplete="new-password"
                error={errors.confirmPassword}
                required
                maxLength={128}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                }
                onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </div>

            {/* Password Strength Indicator - Full Width */}
            {passwordStrength && formData.password && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${getStrengthColor(passwordStrength.strength)} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {getStrengthText(passwordStrength.strength)}
                  </span>
                </div>

                {/* Password Requirements - Inline */}
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  {passwordStrength.requirements.map((req, index) => (
                    <span key={index} className={`px-1.5 py-0.5 rounded ${req.met ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {req.met ? '✓' : '○'} {req.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Security Notice - Compact */}
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
              Güçlü şifre ile hesabınızı koruyun. Şifrenizi kimseyle paylaşmayın.
            </div>

            {/* Legal Terms - Compact */}
            <div className="text-xs text-gray-500 leading-tight">
              Kayıt olarak{' '}
              <Link href="/legal/terms" className="text-purple-600 hover:text-purple-700">
                Kullanım Şartları
              </Link>{' '}
              ve{' '}
              <Link href="/legal/privacy" className="text-purple-600 hover:text-purple-700">
                Gizlilik Politikası
              </Link>{' '}
              'nı kabul etmiş olursunuz.
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
            >
              Kayıt Ol
            </Button>

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
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">veya</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google ile Kayıt Ol
          </Button>
        </div>

        <p className="text-center text-gray-600 mt-3 text-sm">
          Zaten hesabın var mı?{' '}
          <Link href="/auth/login" className="text-purple-600 hover:text-purple-700 font-medium">
            Giriş Yap
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}