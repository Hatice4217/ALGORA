import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createSupabaseServerClient } from './server';
import { cookies } from 'next/headers';

// 1. OpenAI client'ını API anahtarı ile başlat.
// Bu anahtar, projenizin kök dizinindeki `.env.local` dosyasından okunur.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  // Güvenlik: Kullanıcının oturumunu kontrol et.
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    // 2. İstekten gelen JSON verisini (konu, zorluk vb.) al.
    const { subject, topic, difficulty, exam_type } = await request.json();

    // 3. Gerekli parametreler eksikse, 400 Bad Request hatası döndür.
    if (!subject || !topic || !difficulty || !exam_type) {
      return NextResponse.json(
        { error: 'Eksik parametreler: subject, topic, difficulty, exam_type gereklidir.' },
        { status: 400 }
      );
    }

    // 4. OpenAI'a gönderilecek olan prompt'u (talimatı) oluştur.
    const prompt = `
      Türkiye'deki ${exam_type} sınavı için ${subject} dersinin "${topic}" konusuyla ilgili, zorluk seviyesi "${difficulty}" olan bir çoktan seçmeli soru oluştur.
      Soru formatı şu JSON yapısında olmalı:
      {
        "question_text": "Soru metni burada olacak.",
        "choices": ["A seçeneği", "B seçeneği", "C seçeneği", "D seçeneği"],
        "correct_answer": 0, // Doğru cevabın indeksi (0, 1, 2, veya 3)
        "explanation": "Doğru cevabın adım adım açıklaması burada olacak."
      }
      Sadece ve sadece bu JSON formatında cevap ver, başka hiçbir metin ekleme.
    `;

    // 5. OpenAI API'sine isteği gönder.
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Güncel ve verimli bir model
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }, // Cevabın JSON olmasını zorunlu kıl
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error('OpenAI API returned an empty content.');
    }

    const questionData = JSON.parse(content);

    // 6. Başarılı cevabı istemciye gönder.
    return NextResponse.json({ success: true, data: questionData });

  } catch (error: any) {
    // 7. Hata durumunda, hatayı terminalde logla ve 500 durum koduyla anlamlı bir mesaj dön.
    console.error('❌ AI Question Generation Error:', error);
    return NextResponse.json(
      { error: 'Yapay zeka ile soru üretilirken bir sunucu hatası oluştu.', details: error.message },
      { status: 500 }
    );
  }
}