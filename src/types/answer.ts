import { z } from 'zod';

// Answer Types
export interface Answer {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
  time_spent: number; // seconds
  answered_at: string;
}

export interface UserStats {
  user_id: string;
  total_questions_answered: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy_rate: number; // percentage
  average_time_per_question: number; // seconds
  subject_breakdown: SubjectStats[];
  weekly_progress: ProgressData[];
  weak_areas: string[];
  strong_areas: string[];
}

export interface SubjectStats {
  subject: string;
  total_questions: number;
  correct_answers: number;
  accuracy_rate: number;
}

export interface ProgressData {
  date: string;
  questions_answered: number;
  accuracy_rate: number;
}

// Zod Schemas
export const AnswerSubmissionSchema = z.object({
  question_id: z.string().uuid('Geçersiz soru ID'),
  selected_answer: z.number().int().min(0).max(3, 'Geçersiz cevap (0-3 arası olmalı)'),
  time_spent: z.number().int().positive('Geçersiz süre').optional(),
});
