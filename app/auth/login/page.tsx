'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authHelpers } from '@/lib/supabase';
import { Logo } from '../../components/ui/Logo';
import { validateEmail, sanitizeInput, loginRateLimiter } from '@/lib/security';

// Hesap bazlı kilit (3 yanlış deneme → 1 saat): sunucu 429 + lockedUntil döner,
// mutlak zaman localStorage'a yazılır → sayfa yenilense bile geri sayım ekranda kalır.
// Gerçek kilit SUNUCUDADIR (login_lockouts tablosu); localStorage silinse bile
// API 429 döndürmeye devam eder — buradaki sayaç yalnızca UX gösterimidir.
const LOCK_STORAGE_KEY = 'algora_login_lock';

const readStoredLock = (): { email: string; lockedUntil: number } | null => {
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: unknown; lockedUntil?: unknown };
    if (typeof parsed.email === 'string' && typeof parsed.lockedUntil === 'number') {
      return { email: parsed.email, lockedUntil: parsed.lockedUntil };
    }
  } catch {
    // bozuk/erişilemez kayıt → yok say
  }
  return null;
};

const formatCountdown = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
};

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Rate limiting state
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  // Şu an geri sayımı gösterilen kilitli hesap (yalnızca o e-posta yazılınca buton kilitlenir —
  // ortak bilgisayarda başka öğrencinin kilitli hesabı başkasını engellemez)
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);
  const [registeredMessage, setRegisteredMessage] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendInfo, setResendInfo] = useState<string | null>(null);

  // URL params'dan email ve registered bilgisini al
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const registeredParam = urlParams.get('registered');

    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }

    if (registeredParam === 'true') {
      setRegisteredMessage('Hesabın oluşturuldu! E-postana gönderilen onay linkine tıkladıktan sonra giriş yapabilirsin.');
    }
  }, []);

  // O1 hijyeni: giriş sayfası eski oturuma ait isim önbelleğini ve son aktif
  // sekme anahtarını temizler — aynı tarayıcıda hesap değiştirdiğinde önceki
  // hesabın izleri (ad flash'i, sekmeli arayüz durumu) taşınmasın
  useEffect(() => {
    try {
      localStorage.removeItem('userName');
      localStorage.removeItem('algora_active_tab');
    } catch {
      // storage erişilemez → sorun değil
    }
  }, []);

  // Kalıcı kilit geri sayımı: yazılan e-posta kilitli hesapla eşleşirse sayacı
  // localStorage'daki MUTLUK zamandan türet — yenileme/kapat-aç sonrası de devam eder
  useEffect(() => {
    const lock = readStoredLock();
    const emailNorm = formData.email.trim().toLowerCase();
    if (lock && lock.lockedUntil > Date.now() && lock.email === emailNorm) {
      setLockedEmail(lock.email);
      setRemainingTime(lock.lockedUntil - Date.now());
      setRateLimitError('Bu hesap çok fazla hatalı deneme nedeniyle geçici olarak kilitlendi.');
    } else if (lockedEmail && (!lock || lock.email !== emailNorm || lock.lockedUntil <= Date.now())) {
      setLockedEmail(null);
    }
  }, [formData.email, lockedEmail]);

  // Form message
  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Şifre RAW kalır (sanitizeInput < > karakterlerini siler → bu karakterleri
    // içeren şifreyle giriş yapılamazdı; React text-node render'da XSS riski yok)
    const sanitized = name === 'password' ? value : sanitizeInput(value);
    setFormData((prev) => ({ ...prev, [name]: sanitized }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Clear rate limit error when user starts typing
    if (rateLimitError) {
      setRateLimitError(null);
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

    // Validate password
    if (!formData.password) {
      showFieldError('password', 'Giriş yapmak için şifrenizi gerekiyoruz');
      hasError = true;
    }

    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Kilit geri sayımı sürerken gönderim yok (buton da kapalı — çift katman)
    if (lockedEmail && remainingTime > 0) {
      return;
    }

    // Clear previous messages
    setRateLimitError(null);
    setFormMessage({ type: null, text: '' });

    // Check rate limit
    if (!loginRateLimiter.canMakeAttempt()) {
      const remaining = loginRateLimiter.getRemainingTime();
      setRemainingTime(remaining);
      setRateLimitError(`Güvenliğiniz için biraz beklemeniz gerekiyor. ${Math.ceil(remaining / 1000)} saniye sonra tekrar deneyin.`);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // S2: giriş artık sunucu proxy'sinden (/api/auth/login) geçer —
      // sunucu-taraflı IP rate limit + enumerasyon-güvenli tek-tip hata.
      // Dönen token'lar setSession ile istemci oturumuna işlenir.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const json = await res.json().catch(() => ({ error: 'Bir hata oluştu. Lütfen tekrar deneyin.' }));

      if (res.status === 429) {
        const retrySn = Number(res.headers.get('Retry-After')) || 60;
        if (json.lockedUntil) {
          // Hesap bazlı kilit: mutlak zamanı sakla → yenileme sonrası sayaç devam eder
          const emailNorm = formData.email.trim().toLowerCase();
          const lockedUntilMs = new Date(json.lockedUntil).getTime();
          try {
            localStorage.setItem(
              LOCK_STORAGE_KEY,
              JSON.stringify({ email: emailNorm, lockedUntil: lockedUntilMs })
            );
          } catch {
            // storage yazılamadı → sayaç yalnızca bu oturumda görünür; sunucu yine korur
          }
          setLockedEmail(emailNorm);
          setRemainingTime(Math.max(1000, lockedUntilMs - Date.now()));
        } else {
          // IP bazlı limit (kısa süreli) — yalnızca oturum içinde gösterilir
          setRemainingTime(retrySn * 1000);
        }
        setRateLimitError(json.error || 'Çok fazla deneme yaptınız. Lütfen bekleyip tekrar deneyin.');
        return;
      }

      if (!res.ok) {
        if (json.error === 'EMAIL_NOT_CONFIRMED') {
          setFormMessage({
            type: 'error',
            text: '📧 E-posta adresiniz henüz onaylanmamış! Lütfen e-posta kutunuzu kontrol edin ve onay linkine tıklayın. Spam klasörünü de kontrol etmeyi unutmayın.'
          });
          return;
        }

        // Hatalı kimlik + kalan deneme hakkı: "Son X deneme hakkınız kaldı"
        const baseMsg: string = json.error || 'E-posta veya şifre hatalı';
        const text =
          typeof json.kalanHak === 'number' && json.kalanHak > 0
            ? `${baseMsg} Son ${json.kalanHak} deneme hakkınız kaldı.`
            : baseMsg;
        setFormMessage({ type: 'error', text });
        return;
      }

      // Başarılı: oturumu istemci supabase-js'ine işle (localStorage'a yazılır,
      // SIGNED_IN tetiklenir → SessionGuard/dashboard akışı normal çalışır)
      const { supabase } = await import('@/lib/supabase');
      const { error: sessionError } = await supabase!.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });
      if (sessionError) {
        setFormMessage({ type: 'error', text: 'Oturum kurulamadı. Lütfen tekrar deneyin.' });
        return;
      }

      setFormMessage({
        type: 'success',
        text: 'Giriş başarılı! Hoş geldiniz 👋'
      });

      // Başarılı giriş: kilit göstergesini temizle (sunucu reset_failed_login ile zaten sildi)
      try {
        localStorage.removeItem(LOCK_STORAGE_KEY);
      } catch {
        // yoksay
      }

      // Doğrudan Dinamik Soru Bankası'na (onboarding kaldırıldı)
      router.push('/dashboard');
    } catch (error) {
      setFormMessage({
        type: 'error',
        text: 'Bir hata oluştu. Lütfen tekrar deneyin.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Onay maili gelmedi veya süresi doldu → Supabase native resend ile yeniden gönder
  // (Supabase tarafı saniye bazlı limit uygular; hata mesajı resendSignUp içinde Türkçeleştirilir)
  const handleResendVerification = async () => {
    if (!formData.email || resendBusy) return;
    setResendBusy(true);
    setResendInfo(null);
    try {
      const { error } = await authHelpers.resendSignUp(formData.email);
      setResendInfo(
        error
          ? error
          : 'Onay maili yeniden gönderildi. Kutunuzu (ve spam klasörünü) kontrol edin.'
      );
    } finally {
      setResendBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setFormMessage({ type: null, text: '' });

    try {
      const { error } = await authHelpers.signInWithGoogle();
      if (error) {
        setFormMessage({
          type: 'error',
          text: 'Google ile giriş başarısız'
        });
        setIsLoading(false);
      }
    } catch (error) {
      setFormMessage({
        type: 'error',
        text: 'Bir hata oluştu'
      });
      setIsLoading(false);
    }
  };

  // Countdown timer for rate limit + account lock
  useEffect(() => {
    if (remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1000) {
            clearInterval(timer);
            setRateLimitError(null);
            setLockedEmail(prevLocked => {
              if (prevLocked) {
                try {
                  localStorage.removeItem(LOCK_STORAGE_KEY);
                } catch {
                  // yoksay
                }
              }
              return null;
            });
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [remainingTime]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 relative">
        {/* Back to Home Link */}
        <Link
        href="/"
        className="absolute top-6 left-6 text-gray-600 hover:text-purple-600 transition-colors text-sm font-medium flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Ana Sayfa
      </Link>

      <main className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tekrar Hoş Geldin 👋
          </h1>
          <p className="text-gray-600 mb-8">
            Hesabına giriş yaparak öğrenmeye devam et
          </p>

          {/* Registered Success Message */}
          {registeredMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-green-800">{registeredMessage}</p>
              </div>
            </div>
          )}

          {/* Rate Limit Warning */}
          {rateLimitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">Güvenlik Uyarısı:</p>
                  <p className="text-sm text-red-800">{rateLimitError}</p>
                  {remainingTime > 0 && (
                    <p className="text-xs text-red-700 mt-1">
                      Kalan süre: {formatCountdown(remainingTime)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

            <div className="relative">
              <Input
                label="Şifre"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
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
              <div className="absolute right-0 top-0">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Şifremi Unuttum
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={lockedEmail !== null && remainingTime > 0}
            >
              {lockedEmail !== null && remainingTime > 0 ? `Kilitli (${formatCountdown(remainingTime)})` : 'Giriş Yap'}
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

          {/* Onay maili yeniden gönderme */}
          <div className="mt-4 text-center space-y-2">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={!formData.email || resendBusy}
              className="text-sm text-purple-600 hover:text-purple-700 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendBusy ? 'Gönderiliyor...' : 'Onay maili gelmedi mi? Yeniden gönder'}
            </button>
            {resendInfo && (
              <p className={`text-xs ${resendInfo.includes('gönderildi') ? 'text-green-700' : 'text-red-700'}`}>
                {resendInfo}
              </p>
            )}
          </div>

          <div className="relative my-6">
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
            Google ile Giriş Yap
          </Button>
        </div>

        <p className="text-center text-gray-600 mt-6">
          Hesabın yok mu?{' '}
          <Link href="/auth/register" className="text-purple-600 hover:text-purple-700 font-medium">
            Kayıt Ol
          </Link>
        </p>
      </main>
    </div>
    </div>
  );
}