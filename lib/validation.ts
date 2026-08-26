import type { SettingsFormState, SettingsValidationErrors } from '@/types/question';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format
 */
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'E-posta adresi gerekli';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Geçerli bir e-posta adresi girin';
  }
  return null;
};

/**
 * Validates name (minimum 2 characters)
 */
export const validateName = (name: string): string | null => {
  if (!name || name.trim().length < 2) {
    return 'İsim en az 2 karakter olmalı';
  }
  return null;
};

/**
 * Validates target score (0-500 range)
 */
export const validateScore = (score: string): string | null => {
  const numScore = parseFloat(score);
  if (isNaN(numScore)) {
    return 'Geçerli bir sayı girin';
  }
  if (numScore < 0 || numScore > 500) {
    return 'Hedef puan 0-500 arasında olmalı';
  }
  return null;
};

/**
 * Validates study hours (0-24 range)
 */
export const validateStudyHours = (hours: string): string | null => {
  const numHours = parseFloat(hours);
  if (isNaN(numHours)) {
    return 'Geçerli bir sayı girin';
  }
  if (numHours < 0 || numHours > 24) {
    return 'Günlük çalışma saati 0-24 arasında olmalı';
  }
  return null;
};

/**
 * Validates password (minimum 8 characters)
 */
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Şifre gerekli';
  }
  if (password.length < 8) {
    return 'Şifre en az 8 karakter olmalı';
  }
  return null;
};

/**
 * Validates exam date (must be in the future)
 */
export const validateExamDate = (dateString: string): string | null => {
  if (!dateString) {
    return null; // Optional field
  }

  const examDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(examDate.getTime())) {
    return 'Geçerli bir tarih girin';
  }

  if (examDate <= today) {
    return 'Sınav tarihi bugünden sonra olmalı';
  }

  return null;
};

/**
 * Validates complete settings form by section
 */
export const validateSettingsSection = (
  section: 'profile' | 'exam' | 'notifications' | 'account',
  formData: SettingsFormState
): SettingsValidationErrors => {
  const errors: SettingsValidationErrors = {};

  switch (section) {
    case 'profile':
      const nameError = validateName(formData.name);
      if (nameError) errors.name = nameError;

      const emailError = validateEmail(formData.email);
      if (emailError) errors.email = emailError;
      break;

    case 'exam':
      const scoreError = validateScore(formData.target_score);
      if (scoreError) errors.target_score = scoreError;

      const dateError = validateExamDate(formData.exam_date);
      if (dateError) errors.exam_date = dateError;

      const hoursError = validateStudyHours(formData.study_hours_per_day);
      if (hoursError) errors.study_hours_per_day = hoursError;
      break;

    case 'account':
      // Only validate password fields if any of them is filled
      if (formData.current_password || formData.new_password || formData.confirm_password) {
        const currentError = validatePassword(formData.current_password);
        if (currentError) errors.current_password = currentError;

        const newError = validatePassword(formData.new_password);
        if (newError) errors.new_password = newError;

        if (formData.new_password !== formData.confirm_password) {
          errors.confirm_password = 'Şifreler eşleşmiyor';
        }
      }
      break;

    case 'notifications':
      // No validation needed for toggles
      break;
  }

  return errors;
};

/**
 * Checks if a settings section has any errors
 */
export const hasSectionErrors = (
  section: 'profile' | 'exam' | 'notifications' | 'account',
  errors: SettingsValidationErrors
): boolean => {
  switch (section) {
    case 'profile':
      return !!(errors.name || errors.email);
    case 'exam':
      return !!(errors.target_score || errors.exam_date || errors.study_hours_per_day);
    case 'notifications':
      return false;
    case 'account':
      return !!(errors.current_password || errors.new_password || errors.confirm_password);
    default:
      return false;
  }
};
