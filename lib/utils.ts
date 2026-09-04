import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date in Turkish
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

// Format time ago in Turkish
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const intervals = {
    yıl: 31536000,
    ay: 2592000,
    hafta: 604800,
    gün: 86400,
    saat: 3600,
    dakika: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit} önce`;
    }
  }

  return 'az önce';
}

// Calculate accuracy percentage
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

// Format time duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}d ${remainingSeconds}s`
    : `${minutes}d`;
}

// Get exam type display name
export function getExamTypeName(examType: string): string {
  const names: Record<string, string> = {
    TYT: 'Temel Yeterlilik Testi',
    AYT: 'Alan Yeterlilik Testleri',
    LGS: 'Lise Geçiş Sınavı',
  };
  return names[examType] || examType;
}

// Get difficulty display name
export function getDifficultyName(difficulty: string): string {
  const names: Record<string, string> = {
    beginner: 'Başlangıç',
    intermediate: 'Orta',
    advanced: 'İleri',
  };
  return names[difficulty] || difficulty;
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Debounce function
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Get subject color
export function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    Matematik: 'bg-blue-500',
    Türkçe: 'bg-green-500',
    Fizik: 'bg-purple-500',
    Kimya: 'bg-orange-500',
    Biyoloji: 'bg-pink-500',
    Tarih: 'bg-yellow-500',
    Coğrafya: 'bg-teal-500',
    Felsefe: 'bg-indigo-500',
    'Din Kültürü': 'bg-cyan-500',
    İngilizce: 'bg-red-500',
  };
  return colors[subject] || 'bg-gray-500';
}
