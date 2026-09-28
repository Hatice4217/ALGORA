'use client';

import { useEffect, useState } from 'react';

// Bugünün Hedefleri — etkileşimli günlük to-do listesi.
// Kalıcılık: localStorage (cihaz bazlı, hesaptan bağımsız). DB bağlama
// (tüm cihazlarda aynı liste) istenirse sonraki iş.

const STORAGE_KEY = 'algora_daily_goals';

interface Goal {
  id: number;
  text: string;
  done: boolean;
}

export function DailyGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [input, setInput] = useState('');
  // İlk client render'ı tamamlanıp localStorage okunduktan sonra true —
  // o noktaya dek yazma effect'i boş listeyi ezmesin diye bekler.
  const [hydrated, setHydrated] = useState(false);

  // Yükleme (SSR-safe: server'da window yok; boş liste ile başlayıp
  // client'ta dolduğu için hydration uyuşmazlığı da oluşmaz)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setGoals(
            parsed
              .filter(
                (g): g is Goal =>
                  !!g &&
                  typeof g === 'object' &&
                  typeof (g as Goal).text === 'string' &&
                  typeof (g as Goal).done === 'boolean'
              )
              .map((g, i) => ({ id: typeof g.id === 'number' ? g.id : i, text: g.text, done: g.done }))
          );
        }
      }
    } catch {
      // Bozuk JSON / erişilemeyen storage → sessizce boş listeyle devam
    }
    setHydrated(true);
  }, []);

  // Kaydetme (yalnızca hydrate sonrası; aksi halde boş liste üzerine yazar)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // Kota dolu / gizli pencere → kaydedilemedi, liste oturumluk kalır
    }
  }, [goals, hydrated]);

  const addGoal = () => {
    const text = input.trim();
    if (!text) return;
    setGoals((prev) => [...prev, { id: Date.now(), text, done: false }]);
    setInput('');
  };

  const toggleGoal = (id: number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  };

  const deleteGoal = (id: number) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const doneCount = goals.filter((g) => g.done).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Bugünün Hedefleri 🎯</h3>
        {goals.length > 0 && (
          <span className="text-xs font-semibold text-purple-600 bg-purple-50 rounded-full px-2.5 py-1">
            {doneCount}/{goals.length} tamam
          </span>
        )}
      </div>

      {/* Ekleme formu */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addGoal();
          }}
          placeholder="örn. Türevden 30 soru çöz"
          maxLength={200}
          className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={addGoal}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          Ekle
        </button>
      </div>

      {/* Liste */}
      {goals.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Henüz hedef yok — bugün ne başarmak istersin?
        </p>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition-colors"
            >
              <input
                type="checkbox"
                checked={goal.done}
                onChange={() => toggleGoal(goal.id)}
                className="w-4 h-4 accent-purple-600 cursor-pointer flex-shrink-0"
                aria-label={`${goal.text} tamamlandı`}
              />
              <span
                className={`flex-1 text-sm break-words ${
                  goal.done ? 'line-through text-gray-400' : 'text-gray-700'
                }`}
              >
                {goal.text}
              </span>
              <button
                onClick={() => deleteGoal(goal.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 md:opacity-0 md:group-hover:opacity-100"
                aria-label="Hedefi sil"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
