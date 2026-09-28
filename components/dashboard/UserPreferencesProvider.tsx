'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authHelpers, dbHelpers } from '../../lib/supabase';

// Kullanıcı sınav tercihleri — global state (Context API), HESABA BAĞLI.
// Tek yazıcı: Ayarlar "Sınav Hedefleri" (savePreferences) — sınav tipi/puan/saat +
// hedef üniversite/bölüm (target_university/target_major) user_profiles'a yazılır.
// localStorage YALNIZCA ön-boyama önbelleğidir ve anahtarı kullanıcıya özeldir
// (`algora_prefs_v1:<userId>`) — eskiden userId'siz tek anahtar vardı; aynı tarayıcıda
// hesap değiştiren kullanıcı diğerinin hedefini görüyordu. Eski anahtar açılışta silinir.
// Okuyanlar: SettingsPanel formu + HedefRozeti (Genel Bakış karşılama rozeti).

export interface UserPreferences {
  examType: 'TYT' | 'AYT' | 'YDT';
  targetScore: string; // form input değeri (string); sayıya kayıtta çevrilir
  studyHoursPerDay: string;
  hedefUniversite: string; // user_profiles.target_university
  hedefBolum: string; // user_profiles.target_major
}

// localStorage/DB'den gelen değeri 3'lü kümeye indirger (bozuk eski cache dahil)
function gecerliTur(t: unknown): UserPreferences['examType'] {
  return t === 'AYT' || t === 'YDT' ? t : 'TYT';
}

const STORAGE_PREFIX = 'algora_prefs_v1';
const LEGACY_KEY = 'algora_prefs_v1'; // userId'siz eski anahtar — hesap karışması kaynağıydı

const DEFAULTS: UserPreferences = {
  examType: 'TYT',
  targetScore: '',
  studyHoursPerDay: '',
  hedefUniversite: '',
  hedefBolum: '',
};

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  hydrated: boolean; // ön-boyama önbelleği okundu
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
  const [userId, setUserId] = useState<string | null>(null);

  // Yetkili kaynak: DB user_profiles; ondan ÖNCE kullanıcının kendi önbelleği ile boyanır.
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) {
          if (!iptal) setHydrated(true);
          return;
        }
        if (iptal) return;
        setUserId(user.id);

        // 1) Kullanıcıya özel ön-boyama önbelleği (eski userId'siz anahtar silinir)
        const ozelAnahtar = `${STORAGE_PREFIX}:${user.id}`;
        try {
          localStorage.removeItem(LEGACY_KEY);
          const raw = localStorage.getItem(ozelAnahtar);
          if (raw) {
            const p = JSON.parse(raw) as Partial<UserPreferences>;
            setPreferences((prev) => ({
              ...prev,
              ...p,
              examType: gecerliTur(p.examType),
            }));
          }
        } catch {
          // bozuk JSON / storage erişilemez → varsayılanlarla devam
        }
        if (!iptal) setHydrated(true);

        // 2) DB — başka cihazda kaydedilen değerler ezer
        const { data } = await dbHelpers.getUserProfile(user.id);
        if (iptal || !data) return;
        const dbTercihleri: Partial<UserPreferences> = {
          examType: gecerliTur(data.exam_type),
          targetScore: data.target_score != null ? String(data.target_score) : '',
          studyHoursPerDay: data.study_hours_per_day != null ? String(data.study_hours_per_day) : '',
          hedefUniversite: data.target_university ?? '',
          hedefBolum: data.target_major ?? '',
        };
        setPreferences((prev) => {
          const birlesik = { ...prev, ...dbTercihleri };
          try {
            localStorage.setItem(ozelAnahtar, JSON.stringify(birlesik));
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
    if (userId) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}:${userId}`, JSON.stringify(p));
      } catch {
        // kota dolu → oturumluk kalır
      }
    }

    const { user } = await authHelpers.getCurrentUser();
    if (!user) return false;
    const sonuc = await dbHelpers.updateUserSettings(user.id, {
      exam_type: p.examType,
      target_score: parseFloat(p.targetScore) || 0,
      study_hours_per_day: parseFloat(p.studyHoursPerDay) || 0,
      target_university: p.hedefUniversite,
      target_major: p.hedefBolum,
    });
    return !sonuc.error;
  }, [userId]);

  return (
    <UserPreferencesContext.Provider value={{ preferences, hydrated, dbSynced, savePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

// Genel Bakış karşılamasındaki motivasyon kutusu — karşılama kartının SAĞINDA durur
// (üstte üniversite, altta bölüm; 480px+ ekranlarda). DashboardPage provider DIŞINDA
// render edildiğinden context'i kendisi okuyamaz — bu yüzden bileşen provider içinde tanımlı.
// İki alan da boşsa Ayarlar > Sınav Hedefleri'ne götüren "Hedefini Belirle" butonu.
export function HedefRozeti({ onHedefBelirle }: { onHedefBelirle: () => void }) {
  const { preferences } = useUserPreferences();
  const { hedefUniversite: uni, hedefBolum: bolum } = preferences;

  if (uni || bolum) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl px-4 py-2.5 text-right shrink-0 max-w-[280px] shadow-sm">
        {uni && (
          <p className="text-sm font-bold text-purple-900 leading-snug">🎓 {uni}</p>
        )}
        {bolum && (
          <p className={`text-xs text-purple-700 leading-snug ${uni ? 'mt-0.5' : 'font-semibold'}`}>
            {bolum}
          </p>
        )}
      </div>
    );
  }
  return (
    <button
      onClick={onHedefBelirle}
      className="shrink-0 inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 text-sm px-4 py-2.5 rounded-xl font-medium shadow-sm hover:bg-purple-200 transition-colors cursor-pointer"
    >
      🎯 Hedefini Belirle
    </button>
  );
}
