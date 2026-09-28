'use client';

import { useState } from 'react';
import { useGoals, todayStr } from './GoalsProvider';

// Bugünün Hedefleri — yalnızca BUGÜNE ait ve tamamlanmamış hedefler listelenir.
// Checkbox'a basınca öğe ~1 sn'lik animasyonla solup listeden düşer (arşive geçer),
// eşzamanlı başarı toast'ı GoalsProvider içinde tetiklenir.
// Tamamlananlar silinmez — Analizler > Hedef Arşivi'nde tarihsel kayıt olarak yaşar.

export function DailyGoals() {
  const { goals, hydrated, addGoal, completeGoal, deleteGoal } = useGoals();
  const [input, setInput] = useState('');
  // Tamamlanma animasyonu oynayan öğe: DOM'da kalır, animasyon bitince listeden düşer
  const [exitingId, setExitingId] = useState<string | null>(null);

  const today = todayStr();
  const todays = goals.filter((g) => g.date === today);
  const open = todays.filter((g) => !g.isCompleted);
  const completed = todays.filter((g) => g.isCompleted);

  const handleToggle = (id: string) => {
    if (exitingId) return; // animasyon sürerken çift tetikleme engeli
    setExitingId(id);
    // Animasyon görünür şekilde bitince state'te tamamlandı işaretlenir:
    // öğe filtreden düşer + başarı toast'ı ateşlenir
    setTimeout(() => completeGoal(id), 900);
  };

  const submit = () => {
    if (!input.trim()) return;
    addGoal(input);
    setInput('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Bugünün Hedefleri 🎯</h3>
        {todays.length > 0 && (
          <span
            className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
              completed.length === todays.length
                ? 'text-green-600 bg-green-50'
                : 'text-gray-500 bg-gray-100'
            }`}
          >
            {completed.length}/{todays.length} hedef
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
            if (e.key === 'Enter') submit();
          }}
          placeholder="örn. Türevden 30 soru çöz"
          maxLength={200}
          className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          Ekle
        </button>
      </div>

      {/* Liste — yalnız bugünün tamamlanmamış hedefleri */}
      {!hydrated ? null : open.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {todays.length > 0
            ? 'Bugünün tüm hedeflerini tamamladın — harikasın! 🎉'
            : 'Henüz hedef yok — bugün ne başarmak istersin?'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {open.map((goal) => (
            <li
              key={goal.id}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-500 ease-out overflow-hidden ${
                exitingId === goal.id
                  ? 'opacity-0 -translate-x-8 max-h-0 py-0 border-transparent'
                  : 'opacity-100 translate-x-0 max-h-24 border-gray-100 hover:border-purple-200 hover:bg-purple-50/40'
              }`}
            >
              <input
                type="checkbox"
                checked={exitingId === goal.id}
                onChange={() => handleToggle(goal.id)}
                className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
                aria-label={`${goal.text} tamamlandı`}
              />
              <span
                className={`flex-1 text-sm break-words transition-colors duration-300 ${
                  exitingId === goal.id ? 'line-through text-gray-400' : 'text-gray-700'
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
