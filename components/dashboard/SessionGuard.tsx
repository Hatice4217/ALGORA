'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Çift-oturum koruması: aynı tarayıcıda oturum anahtarı (sb-<ref>-auth-token)
// ORİJİN BAŞINA TEK olduğundan ikinci hesapla giriş ilk sekmelerin oturumunu
// sessizce ezer (Supabase tasarımı). Bu bileşen değişimi yakalar ve:
//   ① Tam-ekran OPAK kilit açar — yeni hesabın verisi eski sekmede görünmesin
//   ② "Oturumunuz kapatıldı" bilgilendirmesinin ardından landing'e yönlendirir
// signOut ÇAĞRILMAZ — oturum deposu ortak olduğundan yeni hesabın (B'nin)
// oturumu da düşerdi; bu sekme yalnızca güvenli şekilde sonlandırılır.

export function SessionGuard() {
  const [bilinenId, setBilinenId] = useState<string | null>(null);
  const [kilit, setKilit] = useState<{ eposta: string } | null>(null);
  const [saniye, setSaniye] = useState(3);

  useEffect(() => {
    if (!supabase) return;

    // Sayfa açılışındaki mevcut kimlik: sonraki SIGNED_IN bunla karşılaştırılır
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setBilinenId(data.user.id);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Çıkışta sıfırla: aynı sekmede çık-gir normal akıştır, kilit TETİKLENMEZ
      if (event === 'SIGNED_OUT') {
        setBilinenId(null);
        return;
      }
      if (event !== 'SIGNED_IN' || !session?.user) return;
      const yeniId = session.user.id;
      setBilinenId((onceki) => {
        if (!onceki) return yeniId; // ilk tespit (açılış) — kilit yok
        if (onceki !== yeniId) {
          // O1: devralan yeni hesap için eski hesabın isim önbelleğini temizle —
          // kilitleme sonrası açılan ekranda önceki hesabın adı flash etmesin
          try { localStorage.removeItem('userName'); } catch { /* storage kapalıysa sorun değil */ }
          setSaniye(3);
          setKilit({ eposta: session.user.email ?? 'başka bir hesap' });
        }
        return onceki; // kilit kalkmadıkça bilinen kimlik güncellenmez
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Kilit aktifken geri sayım: 0'a inince landing'e tam yüklemeyle dön
  // (router.push yerine location — eski hesabın tüm client state'i ölür)
  useEffect(() => {
    if (!kilit) return;
    if (saniye <= 0) {
      window.location.href = '/';
      return;
    }
    const t = setTimeout(() => setSaniye((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [kilit, saniye]);

  if (!kilit) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Oturumunuz kapatıldı</h2>
        <p className="text-sm text-gray-600 mb-1">
          Bu sekmede <span className="font-semibold">{kilit.eposta}</span> oturumu devraldığı için
        </p>
        <p className="text-sm text-gray-600 mb-6">
          güvenlik gereği bu sayfa kapatıldı. Ana sayfaya yönlendiriliyorsunuz...
        </p>
        <button
          onClick={() => {
            window.location.href = '/';
          }}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          Ana sayfaya dön ({saniye})
        </button>
      </div>
    </div>
  );
}
