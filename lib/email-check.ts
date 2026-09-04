/**
 * Email Availability Check Utility
 *
 * This utility checks if an email is already registered in the system
 * to provide immediate feedback to users during registration.
 */

import { supabase } from './supabase';

/**
 * Check if email is already registered using Supabase Auth
 * This is the most reliable method since it checks the actual auth system
 * @param email - Email to check
 * @returns Promise<{available: boolean, error?: string, message?: string}>
 */
export async function checkEmailAvailability(email: string): Promise<{
  available: boolean;
  error?: string;
  message?: string;
}> {
  if (!supabase) {
    // Supabase yoksa varsayılan olarak available true döndür
    return { available: true };
  }

  try {
    // Email formatını kontrol et
    if (!email || !email.includes('@') || !email.includes('.')) {
      return {
        available: false,
        error: 'Geçerli bir e-posta adresi girin'
      };
    }

    // Supabase Auth ile email kontrolü yap
    // signInWithPassword ile deneme yaparak email var mı öğreniriz
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy-password-check-12345', // Yanlış şifre ile deniyoruz
    });

    // Eğer "Invalid login credentials" hatası alırsak, EMAIL VAR demektir
    // (şifre yanlış olsa bile email kayıtlı)
    if (error) {
      const errorMessage = (error.message || '').toLowerCase();

      if (errorMessage.includes('invalid') && errorMessage.includes('credentials')) {
        // Email var ama şifre yanlış -> Email zaten kayıtlı
        return {
          available: false,
          message: 'Bu e-posta adresi zaten kullanımda'
        };
      }

      // "Email not confirmed" hatası da email var demektir
      if (errorMessage.includes('email not confirmed')) {
        return {
          available: false,
          message: 'Bu e-posta adresi zaten kayıtlı (onay bekliyor)'
        };
      }

      // Diğer hatalar email yok demektir
      if (errorMessage.includes('invalid') || errorMessage.includes('not found')) {
        return {
          available: true,
          message: 'E-posta kullanılabilir'
        };
      }
    }

    // Eğer data.user varsa, email zaten kayıtlı ve login oldu
    if (data?.user) {
      return {
        available: false,
        message: 'Bu e-posta adresi zaten kullanımda'
      };
    }

    // Email available
    return {
      available: true,
      message: 'E-posta kullanılabilir'
    };

  } catch (err) {
    console.error('Email availability check error:', err);
    // Hata durumunda varsayılan olarak available true döndür
    // (kayıt anında Supabase duplicate check yapacak)
    return { available: true, message: 'E-posta kontrol edilemedi' };
  }
}

/**
 * Debounce helper for email check
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Create debounced email checker
 */
export const debouncedEmailCheck = debounce(checkEmailAvailability, 500);
