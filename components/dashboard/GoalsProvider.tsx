'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Hedefler — global state (Context API) + localStorage kalıcılığı.
// Genel Bakış (yalnız bugünün tamamlanmamışları) ve Analizler (tarihsel arşiv)
// aynı provider'ı okur; tek kaynak üzerinden senkron çalışır.
// Veri yapısı: { id, text, isCompleted, date } — date yerel 'YYYY-MM-DD'.
// Not: cihaz bazlı (hesaptan bağımsız); Supabase'e taşımak istenirse yalnızca
// yükleme/yazma effect'leri değişir, arayüz aynı kalır.

export interface Goal {
  id: string;
  text: string;
  isCompleted: boolean;
  date: string; // yerel 'YYYY-MM-DD'
}

const STORAGE_KEY = 'algora_goals_v1';
const LEGACY_KEY = 'algora_daily_goals'; // eski şema: { id, text, done }

// UTC değil YEREL tarih: toISOString() TR akşamları dünü verirdi
export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface GoalsContextValue {
  goals: Goal[];
  hydrated: boolean;
  addGoal: (text: string) => void;
  completeGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
}

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals, GoalsProvider içinde kullanılmalı');
  return ctx;
}

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Yükleme: yeni şema + eski algora_daily_goals şemasının migrasyonu
  useEffect(() => {
    try {
      let loaded: Goal[] = [];
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          loaded = parsed
            .filter(
              (g): g is Goal =>
                !!g &&
                typeof g === 'object' &&
                typeof (g as Goal).text === 'string' &&
                typeof (g as Goal).isCompleted === 'boolean' &&
                typeof (g as Goal).date === 'string'
            )
            .map((g) => ({ id: String(g.id), text: g.text, isCompleted: g.isCompleted, date: g.date }));
        }
      } else {
        const legacyRaw = localStorage.getItem(LEGACY_KEY);
        if (legacyRaw) {
          const legacy: unknown = JSON.parse(legacyRaw);
          if (Array.isArray(legacy)) {
            loaded = legacy
              .filter((g): g is { id: unknown; text: string; done: unknown } => {
                return !!g && typeof g === 'object' && typeof (g as { text?: unknown }).text === 'string';
              })
              .map((g, i) => ({
                id: String(g.id ?? i),
                text: g.text,
                isCompleted: Boolean(g.done),
                date: todayStr(),
              }));
          }
        }
      }
      setGoals(loaded);
    } catch {
      // bozuk JSON / erişilemeyen storage → boş listeyle devam
    }
    setHydrated(true);
  }, []);

  // Kaydetme — hydrate'e dek yazma (boş liste ezmesi yok; DailyGoals deseni)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // kota dolu / gizli pencere → liste oturumluk kalır
    }
  }, [goals, hydrated]);

  const addGoal = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoals((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: trimmed,
        isCompleted: false,
        date: todayStr(),
      },
    ]);
  }, []);

  const completeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, isCompleted: true } : g)));
    // Toast: üst üste tamamlamalarda sayaç sıfırlanıp bildirim tazelenir
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 4500);
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  return (
    <GoalsContext.Provider value={{ goals, hydrated, addGoal, completeGoal, deleteGoal }}>
      {children}

      {/* Başarı toast'ı — hedef tamamlanınca sağ altta belirir, ~4.5 sn sonra kaybolur */}
      {toastVisible && (
        <div className="fixed bottom-4 right-4 z-50 animate-toast-in">
          <div className="flex items-start gap-3 bg-green-600 text-white rounded-xl shadow-lg px-4 py-3 max-w-sm">
            <svg
              className="w-6 h-6 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-sm">🎉 Harika iş! Hedef tamamlandı.</p>
              <p className="text-xs text-green-100 mt-0.5">
                Bu hedefini ve geçmiş başarılarını Analizler sekmesinden takip edebilirsin.
              </p>
            </div>
            <button
              onClick={() => {
                setToastVisible(false);
                if (toastTimer.current) clearTimeout(toastTimer.current);
              }}
              className="text-green-200 hover:text-white transition-colors flex-shrink-0"
              aria-label="Bildirimi kapat"
            >
              <svg className="w-4 h-4 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </GoalsContext.Provider>
  );
}
