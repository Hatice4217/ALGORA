import { z } from 'zod';

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  exam_type: ExamType;
  subjects: Subject[];
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  exam_type: ExamType;
  target_score: number;
  weak_subjects: string[];
  strong_subjects: string[];
  study_hours_per_day: number;
  exam_date?: string;
}

// Enums
export type ExamType = 'TYT' | 'AYT' | 'LGS';

export type Subject =
  | 'Matematik'
  | 'Türkçe'
  | 'Fizik'
  | 'Kimya'
  | 'Biyoloji'
  | 'Tarih'
  | 'Coğrafya'
  | 'Felsefe'
  | 'Din Kültürü'
  | 'İngilizce';

// Zod Schemas
export const RegisterSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalı'),
  email: z.string().email('Geçerli e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

export const LoginSchema = z.object({
  email: z.string().email('Geçerli e-posta girin'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

export const OnboardingSchema = z.object({
  exam_type: z.enum(['TYT', 'AYT', 'LGS'], {
    required_error: 'Sınav tipi seçmelisiniz',
  }),
  subjects: z.array(z.string()).min(1, 'En az bir ders seçmelisiniz'),
  target_score: z.number().min(100, 'Hedef puan 100 veya üzeri olmalı').max(500),
  study_hours: z.number().min(1).max(12),
  exam_date: z.string().optional(),
});
