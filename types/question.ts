export interface Question {
  id?: string;
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  exam_type?: string;
  created_at?: string;
  question_text?: string;
  correct_answer?: number;
}

// Dashboard "Son Çözülenler" panel kaydı (answers JOIN questions, en yeniden eskiye)
export interface RecentAnswer {
  id: string;
  answered_at: string;
  selected_answer: number;
  question: {
    id: string;
    subject: string;
    topic: string;
    difficulty: string; // beginner | intermediate | advanced
    exam_type: string; // TYT | AYT | YDT
    question_text: string;
    choices: string[];
    correct_answer: number;
    explanation: string;
  };
}

// Settings Types
export interface UserProfile {
  id?: string;
  user_id?: string;
  name: string;
  email: string;
  exam_type: 'TYT' | 'AYT' | 'YDT';
  target_score: number;
  exam_date?: string;
  study_hours_per_day: number;
  // Hedef üniversite/bölüm — motivasyon rozetini besler (Sınav Hedefleri bölümü)
  target_university?: string;
  target_major?: string;
  email_notifications: boolean;
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  created_at?: string;
  updated_at?: string;
}

export interface SettingsFormState {
  // Profile section
  name: string;
  email: string;
  // Exam targets section
  exam_type: 'TYT' | 'AYT' | 'YDT';
  target_score: string;
  study_hours_per_day: string;
  hedef_universite: string; // user_profiles.target_university (DB, hesaba bağlı)
  hedef_bolum: string; // user_profiles.target_major (DB, hesaba bağlı)
  // Notifications section
  email_notifications: boolean;
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  // Account section
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface SettingsValidationErrors {
  name?: string;
  email?: string;
  target_score?: string;
  study_hours_per_day?: string;
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
}
