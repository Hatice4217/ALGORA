import { z } from 'zod';

// Question Types
export interface Question {
  id: string;
  subject: Subject;
  topic: string;
  difficulty: Difficulty;
  exam_type: ExamType;
  question_text: string;
  choices: string[];
  correct_answer: number; // Index of correct choice (0-3)
  explanation: string;
  tags: string[];
  created_at: string;
}

export interface GeneratedQuestion {
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuestionFilter {
  subject?: Subject;
  topic?: string;
  difficulty?: Difficulty;
  exam_type?: ExamType;
  limit?: number;
}

// Enums
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

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ExamType = 'TYT' | 'AYT' | 'LGS';

// Zod Schemas
export const QuestionGenerationSchema = z.object({
  subject: z.enum(['Matematik', 'Türkçe', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'İngilizce'], {
    required_error: 'Ders seçmelisiniz',
  }),
  topic: z.string().min(2, 'Konu en az 2 karakter'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Zorluk seviyesi seçmelisiniz',
  }),
  exam_type: z.enum(['TYT', 'AYT', 'LGS'], {
    required_error: 'Sınav tipi seçmelisiniz',
  }),
});

export const AnswerQuestionSchema = z.object({
  question_id: z.string(),
  selected_answer: z.number().min(0).max(3),
  time_spent: z.number().optional(), // seconds
});
