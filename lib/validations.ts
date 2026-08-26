import { z } from 'zod';

// Re-export all schemas from types
// export { RegisterSchema, LoginSchema, OnboardingSchema } from '@/types/user';
// export { QuestionGenerationSchema, AnswerQuestionSchema } from '@/types/question';
// export { AnswerSubmissionSchema } from '@/types/answer';

// Additional validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Şifre en az 6 karakter olmalı');
  }
  if (password.length > 128) {
    errors.push('Şifre en fazla 128 karakter olabilir');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+90|0)?[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Form validation helper
export async function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: any
): Promise<{ success: boolean; data?: T; errors?: any }> {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues };
    }
    return { success: false, errors: error };
  }
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '');
}
