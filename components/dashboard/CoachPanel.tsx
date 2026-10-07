'use client';

// Koç Paneli — hedef puan + günlük saatin EYLEME dönüştüğü yer.
// /api/coach/plan: kural motoru (zayıf ders ağırlıklı dağıtım + saat→soru
// kapasitesi + puan→hedef yükü) + Gemini kişisel notu. İlerleme göstergesi
// answers tablosundaki BUGÜNKÜ GERÇEK cevaplardan sayılır — plan kağıt
// üzerinde kalmaz, çözülen her soru çubuğu doldurur.

import { useEffect, useState } from 'react';
import { authHelpers, supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/api';
import { getSubjectColor } from '../../lib/utils';

interface PlanMaddesi {
  ders: string;
  tur: string;
  soru: number;
  zorluk: 'baslangic' | 'orta' | 'ileri' | 'otomatik';
  basari: number | null;
  neden: string;
}

interface PlanVerisi {
  hedefYok: boolean;
  examType: string;
  hedefPuan: number;
  saat: number;
  gunKaldi: number;
  kapasite: number;
  hedefYuku: number;
  mesaj: string;
  maddeler: PlanMaddesi[];
  motivasyon: string;
  motivasyonKaynak: 'gemini' | 'statik';
}

const ZORLUK_ETIKET: Record<string, string> = {
  baslangic: 'Başlangıç',
  orta: 'Orta',
  ileri: 'İleri',
  otomatik: 'Otomatik 🤖',
};

interface CoachPanelProps {
  // Plan maddesini Dinamik Soru Bankası'nda başlatır (dashboard wrapper'ı
  // sekme geçişini + dersBaslat çağrısını yapar)
  baslat: (ders: string, tur: 'TYT' | 'AYT' | 'YDT', zorluk: string) => void;
  gitAyarlara: () => void;
}

export function CoachPanel({ baslat, gitAyarlara }: CoachPanelProps) {
  const [plan, setPlan] = useState<PlanVerisi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  // Bugün o dersten kaç soru çözüldü (answers tablosundan gerçek sayım)
  const [gununSayilari, setGununSayilari] = useState<Record<string, number>>({});

  useEffect(() => {
    let iptal = false;

    const planiCek = async () => {
      try {
        const response = await authFetch('/api/coach/plan', { method: 'POST' });
        const data = await response.json().catch(() => ({}));
        if (iptal) return;
        if (!response.ok || !data.success) {
          setHata(data.error || 'Plan alınamadı.');
          return;
        }
        setPlan(data.data as PlanVerisi);
      } catch {
        if (!iptal) setHata('Bağlantı hatası — internet bağlantını kontrol edip tekrar deneyebilirsin.');
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    };

    // Bugünün gerçek cevapları: yerel gece yarısından beri ders bazında say
    const gunuSay = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;
        const geceyarisi = new Date();
        geceyarisi.setHours(0, 0, 0, 0);
        const { data } = await supabase!
          .from('answers')
          .select('question:questions(subject)')
          .eq('user_id', user.id)
          .gte('answered_at', geceyarisi.toISOString())
          .limit(300);
        if (iptal || !data) return;
        const sayilar: Record<string, number> = {};
        for (const satir of data as unknown as Array<{ question: { subject: string } | null }>) {
          const ders = satir.question?.subject;
          if (ders) sayilar[ders] = (sayilar[ders] ?? 0) + 1;
        }
        setGununSayilari(sayilar);
      } catch {
        // sayaç okunamadı → 0'la devam, akış bozulmaz
      }
    };

    planiCek();
    gunuSay();
    return () => {
      iptal = true;
    };
  }, []);

  // Yükleniyor iskeleti
  if (yukleniyor) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-2/3 mb-3"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse">
          <div className="h-20 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Hata
  if (hata || !plan) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <span className="text-3xl">😕</span>
          <p className="mt-3 text-slate-600 text-sm">{hata || 'Plan yüklenemedi.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  // Hedef girilmemiş — Ayarlar'a yönlendir (Koç girdisiz çalışmaz)
  if (plan.hedefYok) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <span className="text-4xl">🎯</span>
          <h2 className="mt-4 text-xl font-bold text-slate-800">Koçun hazır — hedefini söyleyin</h2>
          <p className="mt-2 text-slate-600 text-sm max-w-md mx-auto">
            Günlük çalışma planı üretebilmem için hedef puanını ve günlük çalışma saatini
            Ayarlar &gt; Sınav Hedefleri bölümüne girmen gerekiyor. Koç, bu hedefleri
            gerçek başarı verilerinle birleştirip her gün kişiye özel plan çıkarır.
          </p>
          <button
            onClick={gitAyarlara}
            className="mt-5 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold transition-all shadow-lg shadow-purple-200"
          >
            Hedeflerimi Gir
          </button>
        </div>
      </div>
    );
  }

  const tamamlanan = plan.maddeler.filter((m) => (gununSayilari[m.ders] ?? 0) >= m.soru).length;
  const hepsiTamam = plan.maddeler.length > 0 && tamamlanan === plan.maddeler.length;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Hedef çerçevesi — puan ve saat BURADA anlam kazanır */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 flex-wrap">
          <span>🧭</span> Bugünün Planın
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
            {plan.examType}
          </span>
        </h2>
        <div className="mt-3 grid grid-cols-1 min-[480px]:grid-cols-3 gap-3">
          <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3">
            <p className="text-xs text-purple-500 font-semibold">Hedefin</p>
            <p className="text-lg font-bold text-purple-700">{plan.hedefPuan} puan</p>
          </div>
          <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
            <p className="text-xs text-sky-500 font-semibold">Kalan süre</p>
            <p className="text-lg font-bold text-sky-700">{plan.gunKaldi} gün</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-xs text-emerald-500 font-semibold">Günlük</p>
            <p className="text-lg font-bold text-emerald-700">{plan.saat} saat</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">{plan.mesaj}</p>
      </div>

      {/* AI koç notu — kişiselleştirilmiş */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-pink-50 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
            <span>✨</span> AI Koç Notu
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 text-[11px] font-semibold">
            {plan.motivasyonKaynak === 'gemini' ? 'Sana özel üretildi' : 'Koçundan'}
          </span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{plan.motivasyon}</p>
      </div>

      {/* Plan tamamlandı kutlaması */}
      {hepsiTamam && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-5 py-4 animate-toast-in">
          <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
            <span className="text-base">🎉</span> Bugünün planı tamam!
          </h3>
          <p className="text-xs text-emerald-700 mt-1">
            {plan.maddeler.length} branştaki tüm hedefini bugün tamamladın — hedef puanına bir adım daha yaklaştın.
          </p>
        </div>
      )}

      {/* Plan maddeleri — gerçek ilerleme (bugünkü answers sayımı) */}
      <div className="space-y-3">
        {plan.maddeler.map((madde) => {
          const cozulen = gununSayilari[madde.ders] ?? 0;
          const tamam = cozulen >= madde.soru;
          const yuzde = Math.min(100, Math.round((cozulen / madde.soru) * 100));
          return (
            <div
              key={madde.ders}
              className={`bg-white rounded-2xl shadow-sm border p-4 md:p-5 flex flex-col min-[480px]:flex-row min-[480px]:items-center gap-4 transition-colors ${
                tamam ? 'border-emerald-200' : 'border-slate-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getSubjectColor(madde.ders)} text-white`}>
                    {madde.ders}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    {ZORLUK_ETIKET[madde.zorluk] ?? madde.zorluk}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {Math.min(cozulen, madde.soru)}/{madde.soru} soru
                  </span>
                  {tamam && <span className="text-xs font-bold text-emerald-600">✓ Tamam</span>}
                </div>
                {/* İlerleme çubuğu: bugünkü GERÇEK cevaplarla dolar */}
                <div
                  className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={yuzde}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${madde.ders} bugünkü ilerleme`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      tamam
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-r from-purple-400 to-pink-500'
                    }`}
                    style={{ width: `${yuzde}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {madde.neden} · önerilen zorluk: {ZORLUK_ETIKET[madde.zorluk] ?? madde.zorluk}
                </p>
              </div>
              <button
                onClick={() => baslat(madde.ders, madde.tur as 'TYT' | 'AYT' | 'YDT', madde.zorluk)}
                disabled={tamam}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-full min-[480px]:w-auto"
              >
                {tamam ? 'Tamamlandı ✓' : 'Başlat'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 text-center pb-2">
        Plan; hedef puanın, günlük saatini ve gerçek başarı verilerini birleştirerek her gün yeniden hazırlanır.
        Çözdüğün her soru ilerlemeyi anında doldurur.
      </p>
    </div>
  );
}
