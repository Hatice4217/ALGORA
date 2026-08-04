/**
 * Security utilities for authentication inputs
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .trim()
    .slice(0, 500); // Limit length
}

/**
 * Enhanced email validation with stricter rules
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(email);

  if (!sanitized) {
    return { isValid: false, error: 'E-posta adresinizi girmelisiniz' };
  }

  // Stricter email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: 'Geçerli bir e-posta adresi formatı kullanın' };
  }

  // Check for common typos in domains
  const domain = sanitized.split('@')[1];
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const typoDomains = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com', 'outlok.com'];

  if (typoDomains.includes(domain)) {
    return { isValid: false, error: 'E-posta domain\'inde olası yazım hatası. Lütfen kontrol edin.' };
  }

  return { isValid: true };
}

/**
 * Password strength checker
 */
export function checkPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  feedback: string[];
  requirements: { met: boolean; text: string }[];
} {
  const feedback: string[] = [];
  const requirements = [
    { met: password.length >= 8, text: 'En az 8 karakter' },
    { met: /[a-z]/.test(password), text: 'En az 1 küçük harf' },
    { met: /[A-Z]/.test(password), text: 'En az 1 büyük harf' },
    { met: /[0-9]/.test(password), text: 'En az 1 rakam' },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'En az 1 özel karakter' }
  ];

  const metCount = requirements.filter(req => req.met).length;
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;

  if (metCount <= 2) {
    strength = 'weak';
    score = 1;
    feedback.push('Şifre çok zayıf. Güvenliğiniz için güçlü bir şifre kullanın.');
  } else if (metCount <= 4) {
    strength = 'medium';
    score = 2;
    feedback.push('Şifre orta düzeyde. Daha güçlü için diğer gereksinimleri de karşılayın.');
  } else {
    strength = 'strong';
    score = 3;
    feedback.push('Mükemmel! Şifreniz güçlü.');
  }

  return { strength, score, feedback, requirements };
}

/**
 * Validate password against security requirements
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(password);

  if (!sanitized) {
    return { isValid: false, error: 'Hesabınızı güvende tutmak için bir şifre oluşturun' };
  }

  if (sanitized.length < 8) {
    return { isValid: false, error: 'Şifreniz en az 8 karakter olmalı' };
  }

  if (sanitized.length > 128) {
    return { isValid: false, error: 'Şifre çok uzun, daha kısa bir şifre deneyin' };
  }

  // Check for common weak passwords
  const commonWeakPasswords = ['password', '12345678', 'qwerty123', 'abc12345', 'password123'];
  if (commonWeakPasswords.includes(sanitized.toLowerCase())) {
    return { isValid: false, error: 'Bu şifre çok yaygın, daha güvenli bir şifre seçin' };
  }

  return { isValid: true };
}

/**
 * Validate name input
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(name);

  if (!sanitized) {
    return { isValid: false, error: 'Sizi tanımak isteriz, lütfen adınızı paylaşın' };
  }

  if (sanitized.length < 2) {
    return { isValid: false, error: 'Adınız en az 2 karakter olmalı' };
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: 'İsim çok uzun, lütfen kısa bir ad kullanın' };
  }

  // Allow letters, spaces, and common name characters
  if (!/^[a-zA-ZğĞıİöÖşŞüÜçÇ\s]+$/.test(sanitized)) {
    return { isValid: false, error: 'İsim sadece harflerden oluşmalı' };
  }

  return { isValid: true };
}

/**
 * Rate limiting utility for login attempts
 */
export class RateLimiter {
  private attempts: number = 0;
  private lastAttempt: number = 0;
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canMakeAttempt(): boolean {
    const now = Date.now();

    // Reset if window has passed
    if (now - this.lastAttempt > this.windowMs) {
      this.attempts = 0;
      this.lastAttempt = now;
      return true;
    }

    if (this.attempts >= this.maxAttempts) {
      return false;
    }

    this.attempts++;
    this.lastAttempt = now;
    return true;
  }

  getRemainingTime(): number {
    const now = Date.now();
    const windowEnd = this.lastAttempt + this.windowMs;
    return Math.max(0, windowEnd - now);
  }

  reset(): void {
    this.attempts = 0;
    this.lastAttempt = 0;
  }
}

// Singleton instance for login attempts
export const loginRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute