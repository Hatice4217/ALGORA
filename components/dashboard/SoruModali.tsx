'use client';

// Soru Modalı — SEKMEDEN BAĞIMSIZ global katman. Eskiden QuestionPractice
// (Dinamik Soru Bankası) içinde render edildiğinden, Hata Sepeti'nden "Çöz"
// denince arka plan zorla Soru Bankası'na atlıyordu. Artık page.tsx bu
// bileşeni currentQuestion varken hangi sekme açıksa onun ÜZERİNE basıyor:
// sepetten çözünce öğrenci sepette kalır, telafi listesi gözünün önünde
// güncellenir. Tüm state page.tsx'te; bileşen saf görünümdür.

import { useEffect, useRef, useState } from 'react';
import { getSubjectColor } from '../../lib/utils';
import type { Question } from './QuestionPractice';

// DB difficulty değerleri → Türkçe etiketler (Soru Bankası listesi de kullanır)
export const difficultyEtiketleri: Record<string, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

// Gemini dil bilgisi sorularında "altı çizili sözcüğü" <u>sözcük</u> biçiminde
// işaretler (üretim prompt'undaki TEK izinli işaretleme). Bu yardımcı <u>'yu
// gerçek altı çizgiye çevirir; başka hiçbir etiket render edilmez — kalan tüm
// etiketler soyulur (dangerouslySetInnerHTML bilinçli olarak ASLA kullanılmaz).
export function altiCiziliMetniCevir(metin: string) {
  return metin.split(/<u>(.*?)<\/u>/gi).map((parca, i) => {
    const temiz = parca.replace(/<[^>]*>/g, '');
    return i % 2 === 1 ? <span key={i} className="underline">{temiz}</span> : temiz;
  });
}

interface SoruModaliProps {
  examType: string;
  seciliDers: string;
  seciliZorluk: string;
  mevcutSoru: Question;
  cevapGoster: boolean;
  seciliCevap: number | null;
  cevapSec: (index: number) => void;
  soruUret: () => void;
  soruUretiliyor: boolean;
  // V2: Sokratik ipuçları (ücretsiz, kademeli) + Üst Beyin (-1 kredi) + bildirim
  ipuclar: string[];
  acilanIpucu: number;
  ipucuAc: () => void;
  ustBeyinMetni: string | null;
  ustBeyinIstiyor: boolean;
  ustBeyinIste: () => void;
  bildirimDurumu: null | 'gonderildi' | 'askida';
  bildiriliyor: boolean;
  soruBildir: () => void;
  // T2-UX1 onarımı: alert() yerine inline hata banner'ı
  hataMesaji: string | null;
  hataKapat: () => void;
  modalKapat: () => void;
}

export function SoruModali({
  examType,
  seciliDers,
  seciliZorluk,
  mevcutSoru,
  cevapGoster,
  seciliCevap,
  cevapSec,
  soruUret,
  soruUretiliyor,
  ipuclar,
  acilanIpucu,
  ipucuAc,
  ustBeyinMetni,
  ustBeyinIstiyor,
  ustBeyinIste,
  bildirimDurumu,
  bildiriliyor,
  soruBildir,
  hataMesaji,
  hataKapat,
  modalKapat,
}: SoruModaliProps) {
  // Modalın kayan gövdesi — yeni soru gelince en üste kaydırılır (önceki
  // soruda açıklama/ipuclarında aşağı inmiş olabilir; öğrenci yeni sorunun
  // BAŞINI görerek başlasın)
  const modalGovdeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalGovdeRef.current?.scrollTo({ top: 0 });
  }, [mevcutSoru?.id]);

  // Üretim beklenirken geçen süre (saniye) — kilitli butonda gösterilir
  const [beklemeSaniye, setBeklemeSaniye] = useState(0);

  useEffect(() => {
    if (!soruUretiliyor) {
      setBeklemeSaniye(0);
      return;
    }
    const baslangic = Date.now();
    const timer = setInterval(() => {
      setBeklemeSaniye(Math.floor((Date.now() - baslangic) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [soruUretiliyor]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={modalGovdeRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-lg text-sm font-bold bg-purple-100 text-purple-700">
              {mevcutSoru.exam_type || examType}
            </span>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getSubjectColor(mevcutSoru.subject || seciliDers)} text-white`}>
              {mevcutSoru.subject || seciliDers}
            </span>
            {mevcutSoru.topic && mevcutSoru.topic !== 'Genel' && (
              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-100 text-slate-700">
                {mevcutSoru.topic}
              </span>
            )}
            <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-100 text-slate-600">
              {difficultyEtiketleri[mevcutSoru.difficulty ?? ''] ??
                (seciliZorluk === 'otomatik'
                  ? 'Otomatik'
                  : seciliZorluk === 'baslangic'
                  ? 'Başlangıç'
                  : seciliZorluk === 'orta'
                  ? 'Orta'
                  : 'İleri')}
            </span>
            {mevcutSoru.source === 'pool' && (
              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700">
                📚 Havuz
              </span>
            )}
            {mevcutSoru.source === 'generated' && (
              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-amber-100 text-amber-700">
                ✨ Yeni üretildi
              </span>
            )}
          </div>
          <button
            onClick={modalKapat}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Soruyu kapat"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Hata banner'ı (T2-UX1): modal açıkken işlem hatası (bağlantı
              kopması, API hatası) alert yerine burada tatlıca görünür */}
          {hataMesaji && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <span className="text-base leading-none mt-0.5 shrink-0">⚠️</span>
              <p className="flex-1 text-sm text-red-700">{hataMesaji}</p>
              <button
                onClick={hataKapat}
                aria-label="Hatayı kapat"
                className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Soru gövdesi — yeni soru üretilirken eski soruyla etkileşim fiziksel olarak kesilir.
              key= soru id'si: soru değişince blok yeniden mount edilir → giriş animasyonu
              her yeni soruda yeniden oynar (değişim algılanabilsin diye) */}
          <div className="relative">
            <div
              key={mevcutSoru.id ?? 'soru'}
              className={`space-y-6 animate-soru-giris ${soruUretiliyor ? 'opacity-50 pointer-events-none select-none' : ''}`}
            >
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-6">
                  {altiCiziliMetniCevir(mevcutSoru.question)}
                </h3>
              </div>

              <div className="space-y-3">
                {mevcutSoru.choices.map((secenek: string, index: number) => {
                  let butonSinifi = 'border-slate-200 hover:border-purple-300 bg-white';

                  if (cevapGoster) {
                    if (index === mevcutSoru.correctAnswer) {
                      butonSinifi = 'border-emerald-500 bg-emerald-50';
                    } else if (index === seciliCevap && index !== mevcutSoru.correctAnswer) {
                      butonSinifi = 'border-red-400 bg-red-50';
                    }
                  } else if (seciliCevap === index) {
                    butonSinifi = 'border-purple-500 bg-purple-50';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => cevapSec(index)}
                      disabled={cevapGoster || soruUretiliyor}
                      className={`w-full p-4 text-left border rounded-xl transition-all disabled:cursor-not-allowed ${butonSinifi}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          cevapGoster && index === mevcutSoru.correctAnswer
                            ? 'bg-emerald-500 text-white'
                            : cevapGoster && index === seciliCevap && index !== mevcutSoru.correctAnswer
                            ? 'bg-red-400 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="flex-1 text-base text-slate-700">{altiCiziliMetniCevir(secenek)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* V2: Takıldın mı? — Sokratik ipuçları (ücretsiz, kademeli açılır).
                  İpuçları çözümü ifşa etmez; sorunun ipucusu yoksa (eski havuz
                  kayıtları) kart hiç render edilmez. */}
              {!cevapGoster && ipuclar.length > 0 && (
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Takıldın mı?
                    </h4>
                    <span className="text-xs text-slate-500">Ücretsizdir — çözümü ifşa etmez, yön gösterir.</span>
                  </div>
                  {acilanIpucu > 0 && (
                    <ol className="mt-3 space-y-2 list-decimal list-inside">
                      {ipuclar.slice(0, acilanIpucu).map((ipucu, i) => (
                        <li key={i} className="text-sm text-slate-700">{ipucu}</li>
                      ))}
                    </ol>
                  )}
                  {acilanIpucu < ipuclar.length && (
                    <button
                      onClick={ipucuAc}
                      disabled={soruUretiliyor}
                      className="mt-3 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      💡 {acilanIpucu + 1}. İpucu Al (ücretsiz)
                    </button>
                  )}
                </div>
              )}

              {cevapGoster && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Açıklama
                  </h4>
                  <p className="text-slate-600">{mevcutSoru.explanation}</p>
                </div>
              )}

              {/* V2: Üst Beyin (Özel Hoca) — 1 kredi karşılığı adım adım derin anlatım.
                  Buton HER ZAMAN açıktır (kullanıcı kararı); ipucu kullanımına bağlı değildir. */}
              <div className="border border-purple-200 rounded-xl p-4 bg-white">
                {!ustBeyinMetni ? (
                  <>
                    <button
                      onClick={ustBeyinIste}
                      disabled={ustBeyinIstiyor || soruUretiliyor}
                      className="w-full py-3 px-4 rounded-xl bg-purple-50 border-2 border-purple-300 hover:bg-purple-100 hover:border-purple-400 text-purple-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {ustBeyinIstiyor ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Üst Beyin anlatımı hazırlanıyor...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg">🧠</span>
                            <span>Üst Beyin Anlatımı İste</span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold">
                              1 Kredi
                            </span>
                          </>
                        )}
                      </span>
                    </button>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                      Yapay zeka özel hoca soruyu adım adım, konunun mantığıyla birlikte anlatır.
                    </p>
                  </>
                ) : (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="text-lg">🧠</span>
                      Üst Beyin Anlatımı
                    </h4>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{ustBeyinMetni}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Üretim sürerken kilitli gövdenin üstünde spinner örtüsü */}
            {soruUretiliyor && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/40 rounded-xl">
                <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-purple-700">Yeni soru üretiliyor...</span>
              </div>
            )}
          </div>

          {/* V2: Hatalı soru bildirimi — kitle kaynaklı kalite kontrolü.
              2. FARKLI kullanıcının bildirimiyle soru havuzdan otomatik askıya alınır. */}
          <div className="flex items-center justify-between gap-3 flex-wrap -mt-2">
            {bildirimDurumu ? (
              <p className={`text-sm ${bildirimDurumu === 'askida' ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                {bildirimDurumu === 'askida'
                  ? '✓ Teşekkürler! Soru havuzdan askıya alındı, kimseye tekrar gösterilmeyecek.'
                  : '✓ Bildirimin alındı — teşekkürler!'}
              </p>
            ) : (
              <button
                onClick={soruBildir}
                disabled={bildiriliyor || soruUretiliyor}
                className="text-sm text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bildiriliyor ? 'Gönderiliyor...' : '⚠️ Hatalı Soru Bildir'}
              </button>
            )}
          </div>

          {/* Konu artık opsiyonel: "Sıradaki Soru" seçili konu olmadan da çalışır.
              onClick inline ok: soruUret parametresiz — MouseEvent sızmasın */}
          <button
            onClick={() => soruUret()}
            disabled={soruUretiliyor}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
          >
            {soruUretiliyor ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sıradaki soru hazırlanıyor... ({beklemeSaniye} sn)</span>
              </span>
            ) : (
              'Sıradaki Soru'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
