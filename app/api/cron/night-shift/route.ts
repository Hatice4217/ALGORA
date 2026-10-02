// ===================================
// ALGORA V2 — Faz 1b: Gece Vardiyası (Night Shift) Cron'u
// ===================================
//
// Az-trafik penceresinde (TR 00:00-06:00 = UTC 21:00-03:00; TR saati
// sabit UTC+3, YYS yok) iki iş yapar:
//   İŞ 1 — İPUCU BACKFILL: ipucu-öncesi dönemden kalma havuz sorularına
//          (hints NULL) 3 Sokratik ipucu üretip yazar. Başarısız olanlar
//          NULL kalır → sonraki gece tekrar denenir (self-heal).
//   İŞ 2 — KLON ÜRETİMİ (Duolingo modeli): son 48 saatte YANLIŞ cevaplanan
//          sorulardan kişisel klon üretir (clone_of=kök, intended_for=öğrenci,
//          MAX 2 tur). Dashboard'daki "Eksiklerini Kapat" banner'ı bunları teslim eder.
//
// Tetikleyici: GitHub Actions (night-shift.yml, pencere içinde 6 kez) —
// admin key header'ıyla POST. Aynı key yanlışsa 404 MASKESİ (admin deseni).
//
// Kill/bütçe savunması (Vercel Fluid compute):
//   • maxDuration 60 sn + İÇ DEADLINE 50 sn (platform kill'i catch'siz öldürür)
//   • MAX 4 Gemini çağrısı/tur (3 ipucu + 1 klon) — kısa AbortSignal'ler
//     (ipucu 15 sn, klon 25 sn/deneme) → tur başına pratikte 2-3 üretim
//   • night_shift_lock satır-kilidi: çakışan run'lar 'kilitli' skip;
//     10 dk çürük eşiği Vercel kill'e karşı self-heal
//   • Tur sayacı + bekleyen-klon kontrolü → çift klon engeli (ikinci savunma)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminKey } from '../../../../lib/admin-auth';
import {
  generateQuestionViaGemini,
  generateHintsViaGemini,
} from '../../../../lib/question-generation';

export const maxDuration = 60;

// İç deadline platform limitinin (60 sn) altında — kalan süre log/yanıt için
const DEADLINE_MS = 50_000;
const MAX_GEMINI_CAGRISI = 4;
// TR 00:00-06:00 penceresi (UTC): 21,22,23,0,1,2
const PENCERE_SAATLERI = new Set([21, 22, 23, 0, 1, 2]);

// DB difficulty → Gemini prompt zorluk metni (difficultyMap anahtarları farklı)
const DB_DIFFICULTY_TO_TEXT: Record<string, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

// Backfill aday havuzu (PostgREST ORDER BY random() desteklemez → JS örneklemi)
const HINT_ADAY_HAVUZU = 25;
const HINT_TUR_LIMITI = 3;
const HINT_TIMEOUT_MS = 15_000;
const KLON_TIMEOUT_MS = 25_000;
const KLON_TUR_LIMITI = 1;
const KLON_MAX_TUR = 2; // kök başına öğrenci başına toplam klon (Duolingo MAX 2 tur)

// answers embed şeması (JS'te süzülür; service-role → RLS sorunsuz)
interface YanlisCevapKaydi {
  user_id: string;
  question: {
    id: string;
    subject: string;
    topic: string | null;
    difficulty: string;
    exam_type: string;
    question_text: string;
    choices: string[] | null;
    status: string;
    clone_of: string | null;
    intended_for: string | null;
  } | null;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  // 1. ADMIN KEY — yanlış/eksik keyde 404 maskesi (varlık sızıntısı yok)
  if (!verifyAdminKey(request.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // 2. PENCERE GUARD'ı — UTC 21-02 dışı tetiklemeler sessizce skip.
  //    ?force=1 (workflow_dispatch testleri) pencereyi aşar.
  const force = new URL(request.url).searchParams.get('force') === '1';
  const utcSaat = new Date().getUTCHours();
  if (!force && !PENCERE_SAATLERI.has(utcSaat)) {
    return NextResponse.json({
      success: true,
      data: { skipped: true, reason: 'pencere_disi', utc_saat: utcSaat },
    });
  }

  // 3. ENV kontrolü
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || !process.env.GEMINI_API_KEY) {
    console.error('night-shift: env eksik (SUPABASE/SERVICE_ROLE/GEMINI)');
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
  }
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 4. KİLİT CLAIM — atomik RPC; alamazsak (veya RPC yoksa) güvenli skip.
  //    claim_night_shift: locked_at NULL veya 10 dk'dan eskiyse alır.
  const runnerId = crypto.randomUUID();
  const { data: kilitAlindi, error: claimError } = await adminClient.rpc('claim_night_shift', {
    p_runner: runnerId,
  });
  if (claimError) {
    console.error('night-shift: kilit claim hatası:', claimError.message);
    return NextResponse.json({
      success: true,
      data: { skipped: true, reason: 'kilit_hatasi' },
    });
  }
  if (kilitAlindi !== true) {
    return NextResponse.json({
      success: true,
      data: { skipped: true, reason: 'kilitli' },
    });
  }

  let hintsBackfilled = 0;
  let hintsFailed = 0;
  let clonesCreated = 0;
  const cloneAtlama = { tur_siniri: 0, bekleyen_var: 0 };
  let geminiCagrisi = 0;

  try {
    // ═══════════ İŞ 1 — İPUCU BACKFILL ═══════════
    // Adaylar: hints NULL + aktif + genel havuz (klonlar kişiseldir, dokunma).
    // PostgREST random() sıralayamaz → geniş havuz çek, JS'te karıştır, 3 al.
    const { data: adayHavuzu, error: adayError } = await adminClient
      .from('questions')
      .select('id, subject, topic, question_text, choices, correct_answer, explanation')
      .is('hints', null)
      .eq('status', 'active')
      .is('clone_of', null)
      .order('created_at', { ascending: true })
      .limit(HINT_ADAY_HAVUZU);

    if (adayError) {
      console.error('night-shift: ipucu aday sorgusu hatası:', adayError.message);
    } else if (adayHavuzu && adayHavuzu.length > 0) {
      const karilmis = [...adayHavuzu].sort(() => Math.random() - 0.5).slice(0, HINT_TUR_LIMITI);
      for (const soru of karilmis) {
        if (geminiCagrisi >= MAX_GEMINI_CAGRISI || Date.now() - startedAt > DEADLINE_MS) break;
        geminiCagrisi++;
        try {
          const ipuclari = await generateHintsViaGemini({
            subject: soru.subject,
            topic: soru.topic || 'Genel',
            question: soru.question_text,
            choices: Array.isArray(soru.choices) ? soru.choices : [],
            correctAnswer: soru.correct_answer,
            explanation: soru.explanation,
            timeoutMs: HINT_TIMEOUT_MS,
          });
          // Yarış-güvenli yazım: yalnızca hâlâ NULL ise güncelle (başka run
          // aynı soruyu doldurduysa dokunma). Satır dönmezse sayma.
          const { data: guncellenen, error: updateError } = await adminClient
            .from('questions')
            .update({ hints: ipuclari })
            .eq('id', soru.id)
            .is('hints', null)
            .select('id');
          if (updateError) {
            console.error(`night-shift: ipucu yazma hatası (${soru.id}):`, updateError.message);
            hintsFailed++;
          } else if (guncellenen && guncellenen.length > 0) {
            hintsBackfilled++;
          }
        } catch (hintError) {
          // NULL kalır → sonraki gece yeniden denenir (self-heal)
          console.error('night-shift: ipucu üretimi başarısız:', (hintError as Error)?.message);
          hintsFailed++;
        }
      }
    }

    // ═══════════ İŞ 2 — KLON ÜRETİMİ (max 1 klon/tur) ═══════════
    // Adaylar: son 48 saatte YANLIŞ cevaplar. Klon üretimi 2 deneme × 25 sn
    // sürebildiğinden yeterli süre kalmadıysa turu boş geç (sonraki pencere alır).
    const kalanSure = DEADLINE_MS - (Date.now() - startedAt);
    if (geminiCagrisi < MAX_GEMINI_CAGRISI && kalanSure >= 30_000) {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: yanlisCevaplar, error: yanlisError } = await adminClient
        .from('answers')
        .select(
          'user_id, question:questions(id, subject, topic, difficulty, exam_type, question_text, choices, status, clone_of, intended_for)'
        )
        .eq('is_correct', false)
        .gte('answered_at', since)
        .order('answered_at', { ascending: false })
        .limit(200);

      if (yanlisError) {
        console.error('night-shift: yanlış cevap sorgusu hatası:', yanlisError.message);
      } else {
        // JS süzgeci: aktif + kendine ait (klon dahil) + 5 şıklı + DISTINCT
        const gorulenAnahtar = new Set<string>();
        const adaylar: Array<{ userId: string; soru: NonNullable<YanlisCevapKaydi['question']> }> = [];
        for (const kayit of (yanlisCevaplar ?? []) as unknown as YanlisCevapKaydi[]) {
          const soru = kayit.question;
          if (!soru || soru.status !== 'active') continue;
          if (soru.intended_for && soru.intended_for !== kayit.user_id) continue;
          if (!Array.isArray(soru.choices) || soru.choices.length !== 5) continue;
          const anahtar = `${kayit.user_id}:${soru.id}`;
          if (gorulenAnahtar.has(anahtar)) continue;
          gorulenAnahtar.add(anahtar);
          adaylar.push({ userId: kayit.user_id, soru });
        }

        for (const aday of adaylar) {
          if (clonesCreated >= KLON_TUR_LIMITI) break;
          if (geminiCagrisi >= MAX_GEMINI_CAGRISI || Date.now() - startedAt > DEADLINE_MS) break;

          // Klon zinciri kökü: adayın kendisi klonsa atasına bağlan
          const root = aday.soru.clone_of ?? aday.soru.id;

          // Tur sayacı: kökten bu öğrenciye MAX_TUR klonu yapıldıysa atla
          const { count: mevcutKlonSayisi, error: sayacError } = await adminClient
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('clone_of', root)
            .eq('intended_for', aday.userId);
          if (sayacError) {
            console.error('night-shift: klon tur sayacı hatası:', sayacError.message);
            continue;
          }
          if ((mevcutKlonSayisi ?? 0) >= KLON_MAX_TUR) {
            cloneAtlama.tur_siniri++;
            continue;
          }

          // Bekleyen klon: öğrencinin cevaplamadığı aktif klon varsa yenisi üretilmez
          const { data: mevcutKlonlar, error: klonOkumaError } = await adminClient
            .from('questions')
            .select('id')
            .eq('clone_of', root)
            .eq('intended_for', aday.userId)
            .eq('status', 'active');
          if (klonOkumaError) {
            console.error('night-shift: mevcut klon okuma hatası:', klonOkumaError.message);
            continue;
          }
          if (mevcutKlonlar && mevcutKlonlar.length > 0) {
            const klonIdler = mevcutKlonlar.map((k) => k.id);
            const { data: klonCevaplari } = await adminClient
              .from('answers')
              .select('question_id')
              .eq('user_id', aday.userId)
              .in('question_id', klonIdler);
            const cevaplananKlonlar = new Set((klonCevaplari ?? []).map((c) => c.question_id));
            if (mevcutKlonlar.some((k) => !cevaplananKlonlar.has(k.id))) {
              cloneAtlama.bekleyen_var++;
              continue;
            }
          }

          // Tekrar yasağı: orijinal + önceki klonların metinleri
          const { data: kokVeKlonMetinleri } = await adminClient
            .from('questions')
            .select('question_text')
            .or(`id.eq.${root},clone_of.eq.${root}`);
          const bannedQuestions = (kokVeKlonMetinleri ?? [])
            .map((q: { question_text: string | null }) => (q.question_text || '').slice(0, 300))
            .filter((t: string) => t.length > 0);

          geminiCagrisi++;
          try {
            const generated = await generateQuestionViaGemini({
              subject: aday.soru.subject,
              topic: aday.soru.topic || 'Genel',
              difficultyText: DB_DIFFICULTY_TO_TEXT[aday.soru.difficulty] ?? 'Orta',
              examType: aday.soru.exam_type,
              bannedQuestions,
              timeoutMs: KLON_TIMEOUT_MS,
            });

            // Klon insert: created_by=NULL (hesap silmede FK 23503 tuzağı kapalı),
            // kişisellik clone_of+intended_for ile (havuz RPC bunları servis etmez)
            const { error: insertError } = await adminClient
              .from('questions')
              .insert({
                subject: aday.soru.subject,
                topic: aday.soru.topic || 'Genel',
                difficulty: aday.soru.difficulty,
                exam_type: aday.soru.exam_type,
                question_text: generated.question,
                choices: generated.choices,
                correct_answer: generated.correctAnswer,
                explanation: generated.explanation,
                hints: generated.hints.length === 3 ? generated.hints : null,
                clone_of: root,
                intended_for: aday.userId,
                created_by: null,
              });
            if (insertError) {
              console.error('night-shift: klon insert hatası:', insertError.message);
            } else {
              clonesCreated++;
              console.log(
                `night-shift: klon üretildi — root=${root} user=${aday.userId} (${aday.soru.subject}/${aday.soru.topic || 'Genel'})`
              );
            }
          } catch (klonError) {
            console.error('night-shift: klon üretimi başarısız:', (klonError as Error)?.message);
          }
          // Klon denemesi tur bütçesinin büyük kısmını yer → tek aday/yeter
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        skipped: false,
        hints_backfilled: hintsBackfilled,
        hints_failed: hintsFailed,
        clones_created: clonesCreated,
        clone_atlama: cloneAtlama,
        gemini_cagrisi: geminiCagrisi,
        sure_ms: Date.now() - startedAt,
      },
    });
  } catch (error: unknown) {
    console.error('❌ /api/cron/night-shift hatası:', error);
    return NextResponse.json(
      { error: 'Gece vardiyası görevi çalıştırılırken bir hata oluştu.' },
      { status: 500 }
    );
  } finally {
    // 5. KİLİT BIRAK — yalnızca kendi kilidimizse (RPC koşullu; hata sadece log)
    const { error: releaseError } = await adminClient.rpc('release_night_shift', {
      p_runner: runnerId,
    });
    if (releaseError) {
      console.error('night-shift: kilit bırakma hatası (10 dk sonra kendiliğinden çürür):', releaseError.message);
    }
  }
}
