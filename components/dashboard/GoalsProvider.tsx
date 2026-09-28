'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { authHelpers, dbHelpers } from '../../lib/supabase';
import type { GoalRow } from '../../lib/supabase';

// Hedefler — HESABA BAĞLI (user_goals tablosu; RLS yalnız kendi satırlarına izin verir).
// Önceden localStorage'daydı: aynı tarayıcıda hesap değiştiren kullanıcı başkasının
// hedeflerini görüyordu → DB'ye taşındı (cihazlar arası senkron da sağlanır).
// Genel Bakış (bugünün hedefleri) ve Analizler (Hedef Arşivi) aynı provider'ı okur.
// Yazmalar iyimserdir: state anında güncellenir, DB yazımı hata verirse geri alınır.

export interface Goal {
  id: string;
  text: string;
  isCompleted: boolean;
  date: string; // yerel 'YYYY-MM-DD'
}

function satirdanHedef(satir: GoalRow): Goal {
  return { id: satir.id, text: satir.goal_text, isCompleted: satir.is_completed, date: satir.date };
}

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
  const [userId, setUserId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Yükleme: DB'den hedefler. Eski localStorage anahtarları SİLİNİR — asla DB'ye
  // taşınmaz (farklı hesabın hedefi yanlış hesaba kopyalanmasın; karışma zaten bug'dı)
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        localStorage.removeItem('algora_goals_v1');
        localStorage.removeItem('algora_daily_goals');
      } catch {
        // storage erişilemez → sorun değil
      }
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;
        const { data } = await dbHelpers.getGoals(user.id);
        if (iptal) return;
        setUserId(user.id);
        if (data) {
          setGoals((data as unknown as GoalRow[]).map(satirdanHedef));
        }
      } catch {
        // bağlantı yok → boş listeyle devam
      } finally {
        if (!iptal) setHydrated(true);
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  const addGoal = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !userId) return;
    // İyimser ekleme: geçici id ile anında listede, DB onayınca gerçek id ile değişir
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setGoals((prev) => [...prev, { id: tempId, text: trimmed, isCompleted: false, date: todayStr() }]);
    (async () => {
      const { data, error } = await dbHelpers.addGoalDb(userId, trimmed, todayStr());
      if (error || !data) {
        setGoals((prev) => prev.filter((g) => g.id !== tempId));
        return;
      }
      setGoals((prev) => prev.map((g) => (g.id === tempId ? satirdanHedef(data as GoalRow) : g)));
    })();
  }, [userId]);

  const completeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, isCompleted: true } : g)));
    // Toast: üst üste tamamlamalarda sayaç sıfırlanıp bildirim tazelenir
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 4500);

    if (!userId) return;
    (async () => {
      const { error } = await dbHelpers.setGoalCompleted(userId, id, true);
      if (error) {
        setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, isCompleted: false } : g)));
      }
    })();
  }, [userId]);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (!userId) return;
    (async () => {
      const { error } = await dbHelpers.deleteGoalDb(userId, id);
      if (error) {
        // Silme başarısız: listeyi DB'den yeniden kur (hedefi yerine koyar, sıra korunur)
        const { data } = await dbHelpers.getGoals(userId);
        if (data) setGoals((data as unknown as GoalRow[]).map(satirdanHedef));
      }
    })();
  }, [userId]);

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
