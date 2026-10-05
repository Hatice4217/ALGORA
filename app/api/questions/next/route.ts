// ===================================
// ALGORA V2 — Havuz-İlk Soru Endpoint'i
// ===================================
// Havuz (pool-first) akışının tek giriş kapısı:
//   1. Önce questions havuzundan (get_next_pool_question RPC) uygun soru aranır
//      → VARSAYSA 0.1 sn'de döner. Gemini ÇAĞRILMAZ, kredi DÜŞÜLMEZ.
//   2. Havuz tükenmişse (RPC null) Gemini fallback üretir, soru ipuçlarıyla
//      birlikte havuza eklenir ve öğrenciye sunulur.
//
// ⚠️ V2 KREDİ MODELİ: soru çekmek/çözmek SINIRSIZ ve ÜCRETSİZDİR (free dahil).
// Bu route'ta deduct/refund/rollover/402 YOKTUR — kredi artık yalnızca
// "Üst Beyin" (1b'de gelecek çözüm endpoint'i) için harcanır.
// Maliyet kontrolü rate-limit (burst) + havuzun kendisiyle sağlanır:
// her fallback üretimi havuzu doldurur, aynı kova sonraki istekte HIT döner.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { rateLimit } from '../../../../lib/rate-limit';
import { getSubjects, getTopics } from '../../../../lib/constants/syllabus';
import {
  difficultyMap,
  difficultyToDb,
  generateQuestionViaGemini,
  GeminiUpstreamError,
} from '../../../../lib/question-generation';

// Sunucu tarafı girdi whitelist'i — MEB_SYLLABUS'taki tüm derslerden türetilir
const VALID_SUBJECTS: readonly string[] = [
  ...new Set([...getSubjects('TYT'), ...getSubjects('AYT'), ...getSubjects('YDT')]),
];
const VALID_EXAM_TYPES: readonly string[] = ['TYT', 'AYT', 'YDT'];
const TOPIC_MAX_LENGTH = 100;
const PREVIOUS_QUESTION_MAX_LENGTH = 2000;
// Oturumda görülen sorular: havuz RPC'sine exclude olarak geçilir (mükerrer önleme)
const EXCLUDE_MAX_ITEMS = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// get_next_pool_question RPC dönüş şeması (jsonb — fonksiyonda explicit alan listesi)
interface PoolQuestion {
  id: string;
  exam_type: string;
  subject: string;
  topic: string;
  difficulty: string;
  question_text: string;
  choices: string[];
  correct_answer: number;
  explanation: string;
  hints: string[] | null;
}

export async function POST(request: Request) {
  try {
    // 0. AUTH — havuz okuması da oturum ister (istatistik/kişisel filtre için şart)
    if (!supabase) {
      return NextResponse.json(
        { error: 'Veritabanı bağlantısı kurulamadı' },
        { status: 500 }
      );
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 0.1 BURST LİMİTİ — havuz okuması ucuz olsa da fallback Gemini çağırabildiği
    // için üst sınır şart (ücretsiz modelde tek maliyet freni budur)
    const burst = rateLimit(`next:${user.id}`, 20, 60_000);
    if (!burst.ok) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(burst.retryAfterSec) } }
      );
    }

    // 0.5 Service-role client (RPC + questions insert)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('next: SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. İstek gövdesi
    // examType: yeni alan; exam_type: geriye dönük uyum yedeği
    // exclude: bu oturumda ekrana gelen soru id'leri (UUID dizisi)
    const body = await request.json().catch(() => ({}));
    const { subject, topic, difficulty, exam_type, examType, previous_question, exclude } = body as {
      subject?: unknown;
      topic?: unknown;
      difficulty?: unknown;
      exam_type?: unknown;
      examType?: unknown;
      previous_question?: unknown;
      exclude?: unknown;
    };

    // 2. Girdi doğrulaması (Faz 0.8 standartları: whitelist + Object.hasOwn)
    if (!subject || !difficulty) {
      return NextResponse.json(
        { error: 'Eksik parametreler: subject ve difficulty gereklidir.' },
        { status: 400 }
      );
    }
    if (
      typeof subject !== 'string' ||
      typeof difficulty !== 'string' ||
      !VALID_SUBJECTS.includes(subject) ||
      !Object.hasOwn(difficultyMap, difficulty)
    ) {
      return NextResponse.json(
        { error: 'Geçersiz ders veya zorluk seviyesi.' },
        { status: 400 }
      );
    }
    const rawExamType = examType !== undefined ? examType : exam_type;
    if (
      rawExamType !== undefined &&
      (typeof rawExamType !== 'string' || !VALID_EXAM_TYPES.includes(rawExamType))
    ) {
      return NextResponse.json(
        { error: 'Geçersiz sınav türü. TYT, AYT veya YDT olmalıdır.' },
        { status: 400 }
      );
    }
    const effectiveExamType = typeof rawExamType === 'string' ? rawExamType : 'TYT';
    const safeTopic = typeof topic === 'string' ? topic.trim().slice(0, TOPIC_MAX_LENGTH) : '';
    // G1 onarımı: dolu konu MEB müfredat whitelist'inde olmalı — arayüz yalnız
    // dropdown'dan liste değeri gönderir; buraya düşen istek üretimdir → 400
    if (safeTopic && !getTopics(effectiveExamType, subject).includes(safeTopic)) {
      return NextResponse.json(
        { error: 'Geçersiz konu. Lütfen listeden bir konu seçin.' },
        { status: 400 }
      );
    }
    const safePreviousQuestion =
      typeof previous_question === 'string'
        ? previous_question.trim().slice(0, PREVIOUS_QUESTION_MAX_LENGTH)
        : '';

    // Exclude listesi: yalnızca geçerli UUID'ler, tekilleştirilmiş, tavanlı
    const excludeIds: string[] = Array.isArray(exclude)
      ? Array.from(
          new Set(
            exclude.filter(
              (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id)
            )
          )
        ).slice(0, EXCLUDE_MAX_ITEMS)
      : [];

    const difficultyText = difficultyMap[difficulty] || difficulty;
    const dbDifficulty = difficultyToDb[difficulty] || difficulty;
    const startedAt = Date.now();

    // 3. HAVUZ-İLK — RPC null dönerse fallback'e düşer
    let poolHit: PoolQuestion | null = null;
    try {
      const { data, error: rpcError } = await adminClient.rpc('get_next_pool_question', {
        p_user_id: user.id,
        p_exam_type: effectiveExamType,
        p_subject: subject,
        p_topic: safeTopic || null,
        p_difficulty: dbDifficulty,
        p_exclude: excludeIds,
      });
      if (rpcError) {
        // Kritik: RPC yoksa (migration çalıştırılmadı) HER istek fallback'e düşer
        // → Gemini maliyeti rastgele artar. Log sıkı izlenmeli.
        console.error('next: get_next_pool_question RPC hatası (fallback devrede):', rpcError.message);
      } else if (data) {
        poolHit = data as PoolQuestion;
      }
    } catch (poolException) {
      console.error('next: havuz sorgusu istisnası (fallback devrede):', poolException);
    }

    if (poolHit) {
      console.log(`next: pool HIT ${Math.round((Date.now() - startedAt) * 100) / 100}ms — ${effectiveExamType}/${subject}/${safeTopic || 'Genel'}/${dbDifficulty}`);
      return NextResponse.json({
        success: true,
        data: {
          id: poolHit.id,
          question: poolHit.question_text,
          choices: poolHit.choices,
          correctAnswer: poolHit.correct_answer,
          explanation: poolHit.explanation,
          hints: Array.isArray(poolHit.hints) ? poolHit.hints : [],
          subject: poolHit.subject,
          topic: poolHit.topic,
          difficulty: poolHit.difficulty,
          exam_type: poolHit.exam_type,
          source: 'pool',
        },
      });
    }

    // 4. FALLBACK — havuz tükendi: Gemini üretir, soru havuza eklenir
    console.log(`next: pool MISS → Gemini fallback — ${effectiveExamType}/${subject}/${safeTopic || 'Genel'}/${dbDifficulty}`);

    // Tekrar önleme: bu öğrencinin bu derste ürettiği son 5 soru + istemciden
    // gelen son soru metni, Gemini'ye yasak liste olarak girer
    let recentQuestionTexts: string[] = [];
    try {
      const { data: recentQuestions, error: recentError } = await adminClient
        .from('questions')
        .select('question_text')
        .eq('subject', subject)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentError) {
        console.error('next: son sorular okunamadı (tekrar yasağı zayıflar):', recentError.message);
      } else if (recentQuestions) {
        recentQuestionTexts = recentQuestions
          .map((q: { question_text: string | null }) => (q.question_text || '').slice(0, 300))
          .filter((t: string) => t.length > 0);
      }
    } catch (recentException) {
      console.error('next: son sorular sorgusu istisnası:', recentException);
    }

    const bannedQuestions = Array.from(
      new Set([
        ...recentQuestionTexts,
        ...(safePreviousQuestion ? [safePreviousQuestion.slice(0, 300)] : []),
      ])
    );

    const generated = await generateQuestionViaGemini({
      subject,
      topic: safeTopic || 'Genel',
      difficultyText,
      examType: effectiveExamType,
      bannedQuestions,
    });

    if (!generated.question || generated.choices.length !== 5) {
      console.error('next: geçersiz soru formatı:', generated);
      throw new Error('Yapay zekadan geçersiz soru formatı alındı');
    }

    // 5. Havuza ekle (ipuçlarıyla birlikte; created_by = tetikleyen öğrenci —
    // istatistik/iz öğretir, soru GLOBAL havuza girer)
    let questionId = crypto.randomUUID(); // insert başarısızsa yedek (cevap kaydı bu durumda düşer)
    const { data: insertedQuestion, error: insertError } = await adminClient
      .from('questions')
      .insert({
        subject,
        topic: safeTopic || 'Genel',
        difficulty: dbDifficulty,
        exam_type: effectiveExamType,
        question_text: generated.question,
        choices: generated.choices,
        correct_answer: generated.correctAnswer,
        explanation: generated.explanation,
        hints: generated.hints.length === 3 ? generated.hints : null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (insertError) {
      // Soruyu kullanıcıya vermeye devam et; sadece logla
      console.error('next: questions insert hatası:', insertError.message);
    } else {
      questionId = insertedQuestion.id;
    }

    console.log(`next: fallback üretim tamam ${Math.round((Date.now() - startedAt) / 1000)}s`);

    return NextResponse.json({
      success: true,
      data: {
        id: questionId,
        question: generated.question,
        choices: generated.choices,
        correctAnswer: generated.correctAnswer,
        explanation: generated.explanation,
        hints: generated.hints,
        subject,
        topic: safeTopic || 'Genel',
        difficulty: dbDifficulty,
        exam_type: effectiveExamType,
        source: 'generated',
      },
    });
  } catch (error: unknown) {
    if (error instanceof GeminiUpstreamError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('❌ /api/questions/next hatası:', error);
    console.error('Error message:', (error as Error)?.message);

    // Genel hata — internal detay istemciye sızdırılmaz (sunucu logunda)
    return NextResponse.json(
      { error: 'Soru alınırken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
