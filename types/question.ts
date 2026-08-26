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

export interface StudyRecord {
  id: number;
  tarih: string;
  ders: string;
  saat: number;
  soru: number;
}

export interface SubjectStat {
  ders: string;
  toplam: number;
  dogru: number;
  basari: number;
}

export interface Statistics {
  toplamSoru: number;
  dogruCevap: number;
  basariOrani: number;
  ortalamaSüre: number;
  dersler: SubjectStat[];
  haftalıkIlerleme: DailyProgress[];
  gelisimGerekenler: string[];
  gucluAlanlar: string[];
}

export interface DailyProgress {
  tarih: string;
  sorular: number;
  basari: number;
}

export interface NewRecord {
  ders: string;
  saat: string;
  soru: string;
}

export interface WeeklyStats {
  buHaftaToplamSaat: string;
  buHaftaToplamSoru: number;
  buGunToplam: string;
}

// Settings Types
export interface UserProfile {
  id?: string;
  user_id?: string;
  name: string;
  email: string;
  exam_type: 'TYT' | 'AYT' | 'LGS';
  target_score: number;
  exam_date?: string;
  study_hours_per_day: number;
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
  exam_type: 'TYT' | 'AYT' | 'LGS';
  target_score: string;
  exam_date: string;
  study_hours_per_day: string;
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
  exam_date?: string;
  study_hours_per_day?: string;
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
}
