// ===================================
// ALGORA — Koç: Günlük Çalışma Planı
// ===================================
// Hoca yönlendirmesi: "Hedef puan ve günlük saati alıyorsan bir ŞEY
// yaptıracaksın." Bu endpoint Ayarlar'daki hedefleri (target_score,
// study_hours_per_day, exam_type) veritabanındaki GERÇEK performansla
// (subject_breakdown + answers.time_spent) birleştirip günlük plan üretir:
//
//   1. KURAL MOTORU (deterministik, anında, kredisiz):
//      - Zayıf ders ağırlıklı dağıtım: plan payı (100 - başarı)% ile orantılı
//      - Saat → soru KAPASİTESİ: günlük saat × 60 / gerçek ortalama çözme süresi
//      - Puan → hedef YÜKÜ: hedef puan / 10 (450 puan → ~45 soru/gün hedefi)
//      - Madde zorluğu başarıya göre: <40% Başlangıç, <75% Orta, ≥75% İleri
//   2. GEMINI KİŞİSEL NOTU (2-3 cümle motivasyon — kural planının üstüne):
//      - flash-lite, 12sn timeout; hata/timeout'ta statik yedek mesaj (akış durmaz)
//
// Plan Talep-Başına türetilir (günlük saklama yok); ilerleme takibi istemci
// tarafında answers tablosundan günün gerçek cevaplarıyla yapılır.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { rateLimit } from '../../../../lib/rate-limit';
import { getSubjects } from '../../../../lib/constants/syllabus';

// ExamCountdown.tsx ile aynı takvim (2027 YKS) — bileşen route'a import
// edilemediğinden burada tekrar; tarih değişirse İKİSİ güncellenmeli.
const SINAV_TARIHLERI: Record<string, number> = {
  TYT: new Date('2027-06-19T10:15:00+03:00').getTime(),
  AYT: new Date('2027-06-20T15:00:00+03:00').getTime(),
  YDT: new Date('2027-06-20T15:00:00+03:00').getTime(),
};

const VALID_EXAM_TYPES: readonly string[] = ['TYT', 'AYT', 'YDT'];

// Zorluk metrikleri: başarı yüzdesi → arayüz zorluk değeri (dersBaslat anlar)
function zorlukOner(basari: number | null): 'baslangic' | 'orta' | 'ileri' | 'otomatik' {
  if (basari === null) return 'otomatik';
  if (basari < 40) return 'baslangic';
  if (basari < 75) return 'orta';
  return 'ileri';
}

// Gemini kişisel notu — başarısızlıkta statik yedek (asla akışı bozmaz)
async function kisiselNotYaz(girdi: {
  hedefPuan: number;
  gunKaldi: number;
  universite: string;
  bolum: string;
  enZayif: string;
  enZayifBasari: number | null;
  planOzeti: string;
}): Promise<{ metin: string; kaynak: 'gemini' | 'statik' }> {
  const statik = `Hedefin ${girdi.hedefPuan} puan ve önünde ${girdi.gunKaldi} gün var. Bugünkü planın en çok ihtiyacın olan dersten başlıyor — küçük ama düzenli adımlar büyük fark yaratır. Hadi başlayalım! 💪`;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { metin: statik, kaynak: 'statik' };

    const universiteBolum =
      [girdi.universite, girdi.bolum].filter(Boolean).join(' · ') || 'belirtilmemiş';
    const zayifCumle =
      girdi.enZayifBasari !== null
        ? `En zayıf branşı ${girdi.enZayif} (%${girdi.enZayifBasari} başarı).`
        : 'Henüz yeterli çözüm verisi yok — plan dengeli dağıtıldı.';

    const prompt = `Sen ALGORA'nın YKS koçusun. Öğrenciye BUGÜNKÜ çalışma planı için 2-3 cümlelik kişisel, samimi ve motive edici bir not yaz. Türkçe yaz, öğrencinin adına hitap et ("sen"), emoji en fazla 1 tane, vaat/kesinlik verme (garantili puan vb. yasak), kısa tut.

Öğrenci verisi:
- Hedef puan: ${girdi.hedefPuan}
- Hedef üniversite/bölüm: ${universiteBolum}
- Sınava kalan gün: ${girdi.gunKaldi}
- ${zayifCumle}
- Bugünkü plan: ${girdi.planOzeti}

Sadece not metnini yaz (başlık, madde işareti, tırnak yok).`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
        }),
      }
    );
    if (!response.ok) return { metin: statik, kaynak: 'statik' };
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const metin = (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
      .trim()
      .slice(0, 400);
    return metin ? { metin, kaynak: 'gemini' } : { metin: statik, kaynak: 'statik' };
  } catch {
    return { metin: statik, kaynak: 'statik' };
  }
}

export async function POST(request: Request) {
  try {
    // 0. AUTH
    if (!supabase) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı kurulamadı' }, { status: 500 });
    }
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Burst limiti: plan hesabı çok ucuz ama Gemini notu var → makas freni
    const burst = await rateLimit(`coach:${user.id}`, 5, 60_000);
    if (!burst.ok) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
      );
    }

    // 0.5 Service-role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('coach: SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. PROFİL — hedef puan + günlük saat + sınav türü (Koç'un girdileri)
    const { data: profil } = await adminClient
      .from('user_profiles')
      .select('exam_type, target_score, study_hours_per_day, target_university, target_major')
      .eq('user_id', user.id)
      .maybeSingle();

    const hedefPuan = typeof profil?.target_score === 'number' ? profil.target_score : null;
    const saat =
      profil?.study_hours_per_day !== null && profil?.study_hours_per_day !== undefined
        ? Number(profil.study_hours_per_day)
        : null;
    const examType =
      typeof profil?.exam_type === 'string' && VALID_EXAM_TYPES.includes(profil.exam_type)
        ? profil.exam_type
        : 'TYT';

    // Hedef girilmemişse istemci Ayarlar'a yönlendirir (boş plan dönme)
    if (!hedefPuan || !saat || saat <= 0) {
      return NextResponse.json({
        success: true,
        data: { hedefYok: true, examType },
      });
    }

    // 2. GERÇEK PERFORMANS — ders başarıları + ortalama çözme süresi
    const { data: breakdown } = await adminClient
      .from('subject_breakdown')
      .select('subject, exam_type, total_questions, correct_answers')
      .eq('user_id', user.id);

    const { data: sureler } = await adminClient
      .from('answers')
      .select('time_spent')
      .eq('user_id', user.id)
      .order('answered_at', { ascending: false })
      .limit(500);

    const ortSn =
      Array.isArray(sureler) && sureler.length > 0
        ? sureler.reduce((top: number, s: { time_spent: number }) => top + (s.time_spent || 0), 0) /
          sureler.length
        : 75; // veri yoksa makul varsayılan

    // 3. KURAL MOTORU
    const sinavDersleri = getSubjects(examType as 'TYT' | 'AYT' | 'YDT');

    // Bu sınav türündeki, anlamlı verisi olan (≥3 soru) dersler — zayıftan güçlüye
    type Satir = { ders: string; basari: number | null; agirlik: number };
    const satirlar: Satir[] = (Array.isArray(breakdown) ? breakdown : [])
      .filter(
        (s: { subject: string; exam_type: string; total_questions: number }) =>
          s.exam_type === examType && sinavDersleri.includes(s.subject) && s.total_questions >= 3
      )
      .map((s: { subject: string; total_questions: number; correct_answers: number }) => ({
        ders: s.subject,
        basari: s.total_questions > 0 ? Math.round((s.correct_answers / s.total_questions) * 100) : null,
        // Zayıf ders daha büyük pay ister; +5 taban: %100 başarılı ders de sıraya girsin
        agirlik: Math.max(5, 100 - (s.total_questions > 0 ? Math.round((s.correct_answers / s.total_questions) * 100) : 50)),
      }))
      .sort((a: Satir, b: Satir) => b.agirlik - a.agirlik);

    // Veri azsa (0-1 ders) sınavın çekirdek dersleriyle tamamla — "yeni branş" maddesi
    const secilmis: Array<Satir & { veriVar: boolean } > = satirlar.slice(0, 3).map((s) => ({ ...s, veriVar: true }));
    for (const ders of sinavDersleri) {
      if (secilmis.length >= 3) break;
      if (!secilmis.some((s) => s.ders === ders)) {
        secilmis.push({ ders, basari: null, agirlik: 40, veriVar: false });
      }
    }

    // Kapasite (saat → soru): saat×3600 sn / ortalama çözme süresi (sn).
    // ×0.6 odak payı — çalışma süresinin tamamı soru çözmez (konu tekrarı,
    // açıklama okuma vb. da zaman yer). Tavan 120: gerçekçi günlük soru sınırı.
    const kapasite = Math.min(
      120,
      Math.max(10, Math.round(((saat * 3600) / Math.max(20, ortSn)) * 0.6))
    );
    const hedefYuku = Math.min(60, Math.max(10, Math.round(hedefPuan / 10)));
    // Plan toplamı kapasiteyle tavanlı; madde başına min 3 tabanıyla çakışmasın
    const toplamSoru = Math.max(
      secilmis.length * 3,
      Math.min(kapasite, Math.max(10, hedefYuku))
    );

    // Ağırlığa göre dağıt (her madde min 3 soru)
    const agirlikToplami = secilmis.reduce((t, s) => t + s.agirlik, 0);
    const hamDagitim = secilmis.map((s) => Math.max(3, Math.round((toplamSoru * s.agirlik) / agirlikToplami)));
    // Yuvarlama farkını en zayıf derse yaz
    hamDagitim[0] += Math.max(0, toplamSoru - hamDagitim.reduce((t, n) => t + n, 0));

    const maddeler = secilmis.map((s, i) => ({
      ders: s.ders,
      tur: examType,
      soru: hamDagitim[i],
      zorluk: zorlukOner(s.basari),
      basari: s.basari,
      neden: s.veriVar
        ? s.basari !== null
          ? `Başarı %${s.basari}`
          : 'Yeni branş'
        : 'Henüz veri yok',
    }));

    // 4. Mesaj + gün sayısı
    const sinavMs = SINAV_TARIHLERI[examType] ?? SINAV_TARIHLERI.TYT;
    const gunKaldi = Math.max(0, Math.ceil((sinavMs - Date.now()) / 86_400_000));
    const mesaj =
      kapasite >= hedefYuku
        ? `Günlük ${saat} saatin ~${kapasite} soru kapasitene karşılık hedefin ~${hedefYuku} soru istiyor — hedefine rahat ulaşırsın.`
        : `Hedef puanın (~${hedefYuku} soru/gün ister) kapasitenin (~${kapasite}) üzerinde — daha verimli çalış ya da süreni artır.`;

    // 5. Gemini kişisel notu
    const enZayif = maddeler[0];
    const { metin: motivasyon, kaynak } = await kisiselNotYaz({
      hedefPuan,
      gunKaldi,
      universite: profil?.target_university || '',
      bolum: profil?.target_major || '',
      enZayif: enZayif?.ders || '',
      enZayifBasari: enZayif?.basari ?? null,
      planOzeti: maddeler.map((m) => `${m.ders} ${m.soru} soru`).join(', '),
    });

    return NextResponse.json({
      success: true,
      data: {
        hedefYok: false,
        examType,
        hedefPuan,
        saat,
        gunKaldi,
        kapasite,
        hedefYuku,
        mesaj,
        maddeler,
        motivasyon,
        motivasyonKaynak: kaynak,
      },
    });
  } catch (error: unknown) {
    console.error('❌ /api/coach/plan hatası:', error, (error as Error)?.message);
    return NextResponse.json(
      { error: 'Plan oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
