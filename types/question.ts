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
