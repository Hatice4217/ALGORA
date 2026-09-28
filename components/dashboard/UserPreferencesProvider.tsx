'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authHelpers, dbHelpers } from '../../lib/supabase';

// Kullanıcı sınav tercihleri — global state (Context API).
// Tek yazıcı: Ayarlar "Sınav Hedefleri" (savePreferences) — sınav tipi/puan/saat
// user_profiles'a (DB, cihazlar arası) + localStorage'a (anlık önbellek) yazılır;
// hedef üniversite/bölüm için DB kolonu YOK → yalnızca localStorage (cihaz-bazlı).
// Okuyanlar: SettingsPanel formu + HedefRozeti (Genel Bakış karşılama rozeti).
// Desen: GoalsProvider ile aynı (hydrated bayrağı → ilk render'da yanıp sönme yok).

export interface UserPreferences {
  examType: 'TYT' | 'AYT';
  targetScore: string; // form input değeri (string); sayıya kayıtta çevrilir
  studyHoursPerDay: string;
  hedefUniversite: string; // motivasyon rozeti — DB kolonu yok, localStorage
  hedefBolum: string;
}

const STORAGE_KEY = 'algora_prefs_v1';

const DEFAULTS: UserPreferences = {
  examType: 'TYT',
  targetScore: '',
  studyHoursPerDay: '',
  hedefUniversite: '',
  hedefBolum: '',
};

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  hydrated: boolean; // localStorage okundu
  dbSynced: boolean; // user_profiles yüklendi (cihazlar arası yetkili veri)
  savePreferences: (p: UserPreferences) => Promise<boolean>; // DB başarısızsa false
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences, UserPreferencesProvider içinde kullanılmalı');
  return ctx;
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [dbSynced, setDbSynced] = useState(false);

  // 1) Anlık önbellek: localStorage — açılışta boş değerler yanıp sönmesin
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<UserPreferences>;
        setPreferences((prev) => ({
          ...prev,
          ...p,
          examType: p.examType === 'AYT' ? 'AYT' : 'TYT',
        }));
      }
    } catch {
      // bozuk JSON → varsayılanlarla devam
    }
    setHydrated(true);
  }, []);

  // 2) Yetkili kaynak: DB user_profiles — başka cihazda kaydedilen değerler ezer.
  //    Üniversite/bölüm DB'de olmadığından bilinçli olarak listelenmez (localStorage korunur).
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;
        const { data } = await dbHelpers.getUserProfile(user.id);
        if (iptal || !data) return;
        const dbTercihleri: Partial<UserPreferences> = {
          examType: data.exam_type === 'AYT' ? 'AYT' : 'TYT',
          targetScore: data.target_score != null ? String(data.target_score) : '',
          studyHoursPerDay: data.study_hours_per_day != null ? String(data.study_hours_per_day) : '',
        };
        setPreferences((prev) => {
          const birlesik = { ...prev, ...dbTercihleri };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(birlesik));
          } catch {
            // kota dolu → oturumluk kalır
          }
          return birlesik;
        });
      } catch {
        // profil yok / bağlantı yok → önbellek değerleriyle devam
      } finally {
        if (!iptal) setDbSynced(true);
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  const savePreferences = useCallback(async (p: UserPreferences): Promise<boolean> => {
    // İyimser güncelleme: rozet DB beklemeden anında tazelenir
    setPreferences(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // kota dolu → oturumluk kalır
    }

    const { user } = await authHelpers.getCurrentUser();
    if (!user) return false;
    const sonuc = await dbHelpers.updateUserSettings(user.id, {
      exam_type: p.examType,
      target_score: parseFloat(p.targetScore) || 0,
      study_hours_per_day: parseFloat(p.studyHoursPerDay) || 0,
    });
    return !sonuc.error;
  }, []);

  return (
    <UserPreferencesContext.Provider value={{ preferences, hydrated, dbSynced, savePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

// Genel Bakış karşılamasındaki motivasyon rozeti. DashboardPage provider DIŞINDA
// render edildiğinden context'i kendisi okuyamaz — bu yüzden rozet provider içinde
// ayrı bileşen. Üniversite+bölüm doluysa rozet; boşsa Ayarlar'a götüren buton.
export function HedefRozeti({ onHedefBelirle }: { onHedefBelirle: () => void }) {
  const { preferences } = useUserPreferences();
  const metin = [preferences.hedefUniversite, preferences.hedefBolum].filter(Boolean).join(' - ');
  const sinif =
    'bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full font-medium inline-flex items-center gap-1.5 shadow-sm mt-2';

  if (metin) {
    return <span className={sinif}>🎓 {metin}</span>;
  }
  return (
    <button
      onClick={onHedefBelirle}
      className={`${sinif} hover:bg-purple-200 transition-colors cursor-pointer`}
    >
      🎯 Hedefini Belirle
    </button>
  );
}
