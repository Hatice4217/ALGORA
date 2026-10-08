'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '../components/ui/Logo';
import { MobileMenu, HamburgerButton } from '../../components/MobileMenu';
import { hesaplaGunlukSeri } from '../../lib/utils';
import { authHelpers, dbHelpers } from '../../lib/supabase';
import { StatisticsCards } from '../../components/dashboard/StatisticsCards';
import { AnalysisPanel } from '../../components/dashboard/AnalysisPanel';
import { QuestionPractice } from '../../components/dashboard/QuestionPractice';
import { CoachPanel } from '../../components/dashboard/CoachPanel';
import { HataSepetiPanel } from '../../components/dashboard/HataSepetiPanel';
import { SettingsPanel } from '../../components/dashboard/SettingsPanel';
import { PackagePanel, UpgradeModal } from '../../components/dashboard/PackagePanel';
import { ProfileAvatar } from '../../components/dashboard/ProfileAvatar';
import { QuotaExhaustedModal } from '../../components/dashboard/QuotaExhaustedModal';
import { DailyGoals } from '../../components/dashboard/DailyGoals';
import { ExamCountdown } from '../../components/dashboard/ExamCountdown';
import { GoalsProvider } from '../../components/dashboard/GoalsProvider';
import { UserPreferencesProvider, HedefRozeti } from '../../components/dashboard/UserPreferencesProvider';
import { SessionGuard } from '../../components/dashboard/SessionGuard';
import { authFetch } from '../../lib/api';
import { getSubjects } from '../../lib/constants/syllabus';

import { PLANS } from '../../types/subscription';
import type { SubscriptionSummary, PaidPlanId } from '../../types/subscription';

import type { Question, RecentAnswer, PendingClone } from '../../types/question';

// Type definitions for dashboard
interface SubjectStat {
  ders: string;
  examType: string; // TYT | AYT | YDT — aynı ders tür başına ayrı satır
  toplam: number;
  dogru: number;
  basari: number;
}

interface DailyProgress {
  tarih: string;
  sorular: number;
  basari: number;
}

interface DashboardStatistics {
  toplamSoru: number;
  dogruCevap: number;
  basariOrani: number;
  dersler: SubjectStat[];
  haftalıkIlerleme: DailyProgress[];
  gelisimGerekenler: string[];
  gucluAlanlar: string[];
}

const DIFFICULTIES = [
  { deger: 'otomatik', etiket: 'Otomatik 🤖' },
  { deger: 'baslangic', etiket: 'Başlangıç' },
  { deger: 'orta', etiket: 'Orta' },
  { deger: 'ileri', etiket: 'İleri' },
];

// Branş-öncelikli akış: tüm sınav türlerinin dersleri TEK kart grid'inde.
// Tek kaynak MEB_SYLLABUS (getSubjects); TYT→AYT→YDT sırayla dolaşılır,
// iki türde okutulan dersler (Matematik vb.) tek kartta iki tür etiketiyle
// listelenir (Map ekleme sırası korunur → TYT dersleri + Türk Dili ve
// Edebiyatı + İngilizce, toplam 11 kart).
const DERS_KARTLARI: Array<{ ders: string; turler: Array<'TYT' | 'AYT' | 'YDT'> }> = (() => {
  const harita = new Map<string, Array<'TYT' | 'AYT' | 'YDT'>>();
  (['TYT', 'AYT', 'YDT'] as const).forEach((tur) => {
    getSubjects(tur).forEach((ders) => {
      harita.set(ders, [...(harita.get(ders) ?? []), tur]);
    });
  });
  return Array.from(harita.entries()).map(([ders, turler]) => ({ ders, turler }));
})();

export default function DashboardPage() {
  const router = useRouter();
  // Giriş yapan kullanıcı doğrudan Dinamik Soru Bankası'nda başlar (onboarding kaldırıldı);
  // son aktif sekme localStorage'dan geri yüklenir (refresh sonrası sekme kaybolmasın)
  const [activeTab, setActiveTab] = useState<'overview' | 'practiceRoom' | 'coach' | 'hataSepeti' | 'analysis' | 'package' | 'settings'>('practiceRoom');
  const [tabRestored, setTabRestored] = useState(false);
  const [statistics, setStatistics] = useState<DashboardStatistics>({
    toplamSoru: 0,
    dogruCevap: 0,
    basariOrani: 0,
    dersler: [],
    haftalıkIlerleme: [],
    gelisimGerekenler: [],
    gucluAlanlar: [],
  }); // Empty state - no mock data
  const [selectedSubject, setSelectedSubject] = useState('Matematik');
  // Sınav türü artık kart tıklamasından gelir (paylaşılan derslerde chooser)
  const [examType, setExamType] = useState<'TYT' | 'AYT' | 'YDT'>('TYT');
  // Hızlı başlatmanın standart zorluğu 'Orta' (Tutarlı Reset kuralı)
  const [selectedDifficulty, setSelectedDifficulty] = useState('otomatik');
  // Konu seçilmeden üretim yapılamaz; ders/sınav türü değişince sıfırlanır
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  // Soru görüntülenmeye başlandığındaki zaman damgası (gerçek çözme süresi için)
  const questionStartedAtRef = useRef<number>(Date.now());
  const [userName, setUserName] = useState<string | null>(null); // null = not loaded yet
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Loading state for auth check
  const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummary | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<PaidPlanId>('pro');
  // Kota bitişinde önce bilgilendirme ekranı (yenileme tarihi) gösterilir;
  // ödeme akışı yalnızca kullanıcı yükseltmeyi seçerse açılır
  const [quotaExhausted, setQuotaExhausted] = useState<{ periodEnd: string | null } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // "Son Çözülenler" paneli (gerçek answers verisi; mock değil)
  const [recentAnswers, setRecentAnswers] = useState<RecentAnswer[]>([]);
  // V2 Faz 1b: bekleyen kişisel klonlar ("Eksiklerini Kapat" banner'ı)
  const [bekleyenKlonlar, setBekleyenKlonlar] = useState<PendingClone[]>([]);
  const [gunlukSeri, setGunlukSeri] = useState(0);
  // V2 havuz akışı: oturumda görülen sorular (havuza exclude edilir — tekrar gelmesin)
  const [gorulenSorular, setGorulenSorular] = useState<string[]>([]);
  // Açılan Sokratik ipucu sayısı (ipuçları ücretsiz, kademeli açılır)
  const [acilanIpucu, setAcilanIpucu] = useState(0);
  // Üst Beyin (Özel Hoca) derin anlatımı — 1 kredi karşılığı
  const [ustBeyinMetni, setUstBeyinMetni] = useState<string | null>(null);
  const [ustBeyinIstiyor, setUstBeyinIstiyor] = useState(false);
  // Hatalı soru bildirimi durumu ('askida' = soru havuzdan otomatik askıya alındı)
  const [bildirimDurumu, setBildirimDurumu] = useState<null | 'gonderildi' | 'askida'>(null);
  const [bildiriliyor, setBildiriliyor] = useState(false);
  // İşlem hatası (T2-UX1 onarımı): alert() yerine inline banner — kopuk bağlantı
  // vb. durumlarda tarayıcı diyaloğu yerine arayüz içinde tatlı bildirim
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  // Initialize userName from localStorage immediately (prevents flash)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedName = localStorage.getItem('userName');
      if (cachedName) {
        setUserName(cachedName);
      }
    }
  }, []);

  // Son aktif sekmeyi geri yükle (refresh'te Genel Bakış/Paketim vb. kaybolmasın).
  // Aşağıdaki ?tab=package URL yönlendirmesi bu restore'u EZER — bilinçli yönlendirme
  // önceliklidir (bu effect URL effect'inden ÖNCE tanımlı; aynı batch'te son çağrı kazanır).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('algora_active_tab');
      if (
        saved === 'overview' ||
        saved === 'practiceRoom' ||
        saved === 'coach' ||
        saved === 'hataSepeti' ||
        saved === 'analysis' ||
        saved === 'package' ||
        saved === 'settings'
      ) {
        setActiveTab(saved);
      }
    } catch {
      // storage erişilemez → varsayılan sekmeyle devam
    }
    setTabRestored(true);
  }, []);

  // Aktif sekme değişince kaydet — yalnızca restore tamamlandıktan sonra
  // (aksi halde mount anında varsayılan 'practiceRoom' kayıtlı sekmeyi ezer)
  useEffect(() => {
    if (!tabRestored || typeof window === 'undefined') return;
    try {
      localStorage.setItem('algora_active_tab', activeTab);
    } catch {
      // yazılamadı → sorun değil, sekme yalnızca oturumluk hatırlanır
    }
  }, [activeTab, tabRestored]);

  // Pricing sayfası yönlendirmesi: /dashboard?tab=package&upgrade=pro|premium
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'package') {
      setActiveTab('package');
    }
    const upgradeParam = params.get('upgrade');
    if (upgradeParam === 'pro' || upgradeParam === 'premium') {
      setUpgradePlan(upgradeParam);
      setShowUpgradeModal(true);
    }
  }, []);

  // Günlük seri kartı: son 60 gündeki cevap tarihlerinden art arda aktif gün sayısı
  const guncelleGunlukSeri = async (userId: string) => {
    try {
      const tarihData = await dbHelpers.getAnswerDates(userId);
      if (tarihData.data) {
        setGunlukSeri(hesaplaGunlukSeri(tarihData.data as string[]));
      }
    } catch (seriError) {
      console.log('Günlük seri alınamadı:', seriError);
    }
  };

  // "Eksiklerini Kapat" klon listesi (cevaplanan klonlar listeden düşer)
  const guncelleBekleyenKlonlar = async (userId: string) => {
    try {
      const klonData = await dbHelpers.getPendingClones(userId);
      if (klonData.data) {
        setBekleyenKlonlar(klonData.data);
      }
    } catch (klonError) {
      console.log('Bekleyen klonlar alınamadı:', klonError);
    }
  };

  // Paket özeti (abonelik + kredi hareketleri + bekleyen talep)
  const fetchSubscription = async () => {
    try {
      const response = await authFetch('/api/subscription');
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.data?.subscription) {
        setSubscriptionSummary(result.data);
      }
    } catch (error) {
      console.log('Paket bilgisi alınamadı:', error);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authHelpers.signOut();
    } catch {
      // Oturum sunucuda zaten yoksa da çıkışa yönlendir
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userName');
    }
    // Kullanıcıyı bilgilendirip ana sayfaya döndür
    setTimeout(() => router.push('/'), 1200);
  };


  // Authentication check and fetch user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) {
          // No user found, redirect to login
          router.push('/auth/login');
          return;
        }

        // User found, set name
        const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Öğrenci';
        setUserName(name);
        setIsLoading(false); // Auth check complete

        // Cache userName in localStorage (prevents flash on reload)
        if (typeof window !== 'undefined') {
          localStorage.setItem('userName', name);
        }

        if (user) {
          // Fetch profile data
          try {
            const profile = await dbHelpers.getUserProfile(user.id);
            if (profile && profile.data && profile.data.name) {
              setUserName(profile.data.name);
              // Update localStorage cache
              if (typeof window !== 'undefined') {
                localStorage.setItem('userName', profile.data.name);
              }
            }
          } catch (profileError) {
            console.log('Profile not found, using metadata');
          }

          // Fetch statistics
          try {
            const statsData = await dbHelpers.getUserStats(user.id);
            if (!statsData.error && statsData.data) {
              const stats = statsData.data;
              setStatistics({
                toplamSoru: stats.total_questions_answered || 0,
                dogruCevap: stats.correct_answers || 0,
                basariOrani: stats.total_questions_answered > 0
                  ? Math.round((stats.correct_answers / stats.total_questions_answered) * 100)
                  : 0,
                dersler: [],
                haftalıkIlerleme: [],
                gelisimGerekenler: [],
                gucluAlanlar: [],
              });
            } else {
              console.log('Statistics not found or error, using default values');
            }
          } catch (statsError) {
            console.log('Could not fetch statistics, using default values:', statsError);
            // Continue with empty values if statistics not found
          }

          // Fetch subject-based performance
          try {
            const subjectData = await dbHelpers.getSubjectBreakdown(user.id);
            if (subjectData.data && subjectData.data.length > 0) {
              // subject_breakdown view sütunları: subject, exam_type, total_questions, correct_answers
              const subjectBreakdown = subjectData.data.map((subject: { subject: string; exam_type: string; total_questions: number; correct_answers: number }) => ({
                ders: subject.subject,
                examType: subject.exam_type,
                toplam: subject.total_questions || 0,
                dogru: subject.correct_answers || 0,
                basari: subject.total_questions > 0
                  ? Math.round((subject.correct_answers / subject.total_questions) * 100)
                  : 0,
              }));

              setStatistics((previous: DashboardStatistics) => ({
                ...previous,
                dersler: subjectBreakdown,
              }));
            }
          } catch (subjectError) {
            console.log('Subject-based performance not found, using empty:', subjectError);
            // Continue with empty values if subject breakdown not found
          }

          // Son çözülen sorular (dashboard sağ panel)
          try {
            const recentData = await dbHelpers.getRecentAnswers(user.id);
            if (recentData.data) {
              setRecentAnswers(recentData.data as unknown as RecentAnswer[]);
            }
          } catch (recentError) {
            console.log('Son çözülenler alınamadı:', recentError);
          }

          // Günlük seri
          guncelleGunlukSeri(user.id);

          // Bekleyen kişisel klonlar ("Eksiklerini Kapat")
          guncelleBekleyenKlonlar(user.id);

          // Paket bilgisi
          fetchSubscription();
        } // Close if (user) block
      } catch (error) {
        console.error('Could not fetch data:', error);
      }
    };

    fetchData();
  }, []);

  // "Son Çözülenler" kaydındaki soruyu cevaplarıyla birlikte tekrar görüntüle
  const reviewRecentAnswer = (kayit: RecentAnswer) => {
    // İnceleme modunda ipucu/Üst Beyin/bildirim state'leri taze başlasın
    setAcilanIpucu(0);
    setUstBeyinMetni(null);
    setBildirimDurumu(null);
    setCurrentQuestion({
      id: kayit.question.id,
      question: kayit.question.question_text,
      choices: kayit.question.choices,
      correctAnswer: kayit.question.correct_answer,
      explanation: kayit.question.explanation,
      subject: kayit.question.subject,
      topic: kayit.question.topic,
      // İnceleme modunda gerçek meta: kayıttaki zorluk + sınav türü (seçicideki
      // anlık değer değil — TYT Coğrafya kaydı AYT seçicideyken yanlış basılmasın)
      difficulty: kayit.question.difficulty,
      exam_type: kayit.question.exam_type,
    });
    setSelectedAnswer(kayit.selected_answer);
    setShowAnswer(true);
  };

  // "Eksiklerini Kapat": bekleyen kişisel klonu çözülmek üzere açar.
  // Klon sıradan soru gibi akar — cevap kaydı/istatistik/Üst Beyin aynı yoldan.
  const klonAc = (klon: PendingClone) => {
    if (isGeneratingQuestion) return;
    // Taze soru: ipucu/Üst Beyin/bildirim state'leri sıfırdan başlar
    setAcilanIpucu(0);
    setUstBeyinMetni(null);
    setBildirimDurumu(null);
    setCurrentQuestion({
      id: klon.id,
      question: klon.question_text,
      choices: klon.choices,
      correctAnswer: klon.correct_answer,
      explanation: klon.explanation,
      subject: klon.subject,
      topic: klon.topic,
      difficulty: klon.difficulty,
      exam_type: klon.exam_type,
      hints: Array.isArray(klon.hints) ? klon.hints : undefined,
    });
    setSelectedAnswer(null);
    setShowAnswer(false);
    // Klon çözülecek bir YENİ soru: süre sayacı şimdi başlar
    questionStartedAtRef.current = Date.now();
  };

  // V2 havuz akışı: soru ARTIK üretilmez, havuzdan GETİRİLİR (kredisiz).
  // Havuzda uygun soru varsa anında döner; yoksa Gemini üretip havuza ekler.
  // `secim` override parametresi stale-closure'ı çözer: kart handler'ı set
  // state + çağrıyı AYNI tikte yapar; klasör güncel state'i değil çağrı
  // anındaki override'ı görür. "Sıradaki Soru" gibi state'ten okuyan
  // çağrılar parametresiz çağırır.
  //
  // ⚡ ÖN-YÜKLEME: havuzdan gelen soru bile zincir yüzünden ~1 sn sürüyor
  // (TR → Vercel edge → fonksiyon → auth + rate limit + adaptif + havuz RPC).
  // Öğrenci mevcut soruyu çözerken SIRADAKİ soru arka planda çekilir;
  // "Sıradaki Soru" tıklandığında eşleşen ön-yükleme ANINDA ekrana gelir.
  // Eşleşme = istek gövdesi birebir aynı (ders/konu/zorluk/sınav + önceki
  // soru metni + exclude listesi). Klon açma/geçmiş inceleme currentQuestion'ı
  // değiştirdiği için gövde eşleşmez → otomatik normal akıza düşer (güvenli).
  const bekleyenSoruRef = useRef<{ istekGovdesi: string; soru: Question } | null>(null);

  const soruIstekGovdesiOlustur = (
    secim: {
      subject?: string;
      topic?: string;
      difficulty?: string;
      examType?: 'TYT' | 'AYT' | 'YDT';
    } | undefined,
    oncekiSoruMetni: string | null,
    excludeListesi: string[]
  ): string =>
    JSON.stringify({
      subject: secim?.subject ?? selectedSubject,
      topic: secim?.topic ?? selectedTopic,
      difficulty: secim?.difficulty ?? selectedDifficulty,
      examType: secim?.examType ?? examType,
      // Sıradaki sorunun öncekinden farklı olması için mevcut soru metnini gönder
      previous_question: oncekiSoruMetni,
      // Bu oturumda görülen sorular havuzdan hariç tutulur (mükerrer önleme)
      exclude: excludeListesi,
    });

  // Arka planda sıradaki soruyu çekip bekleyenSoruRef'e koyar. Hata olursa
  // SESSİZCE vazgeçer — tıklama anında normal akış zaten çalışır.
  const sonrakiniOnyukle = async (
    secim: {
      subject?: string;
      topic?: string;
      difficulty?: string;
      examType?: 'TYT' | 'AYT' | 'YDT';
    } | undefined,
    gosterilenSoru: Question,
    excludeListesi: string[]
  ): Promise<void> => {
    const istekGovdesi = soruIstekGovdesiOlustur(secim, gosterilenSoru.question ?? null, excludeListesi);
    bekleyenSoruRef.current = null;
    try {
      const response = await authFetch('/api/questions/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: istekGovdesi,
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.data) {
        bekleyenSoruRef.current = { istekGovdesi, soru: data.data as Question };
      }
    } catch {
      // sessiz: ön-yükleme başarısızsa tıklama anında normal akış devrede
    }
  };

  // Elde edilen soruyu ekrana uygular + sıradakinin ön-yüklemesini başlatır
  const soruGosterVeOnyukle = (
    soru: Question,
    secim: {
      subject?: string;
      topic?: string;
      difficulty?: string;
      examType?: 'TYT' | 'AYT' | 'YDT';
    } | undefined,
    oncekiExclude: string[]
  ): void => {
    setCurrentQuestion(soru);
    // Soru artık ekranda: çözme süresi sayacını sıfırdan başlat
    questionStartedAtRef.current = Date.now();
    // Oturum exclude listesi (route zaten 100 id ile tavanlı)
    const yeniExclude =
      typeof soru.id === 'string' ? [...oncekiExclude, soru.id].slice(-100) : oncekiExclude;
    if (typeof soru.id === 'string') {
      setGorulenSorular(yeniExclude);
    }
    // Öğrenci bu soruyu çözerken sıradaki arka planda çekilsin
    void sonrakiniOnyukle(secim, soru, yeniExclude);
  };

  const generateQuestion = async (secim?: {
    subject?: string;
    topic?: string;
    difficulty?: string;
    examType?: 'TYT' | 'AYT' | 'YDT';
  }) => {
    // ⚡ Ön-yükleme eşleşmesi: bekleme yok, soru ANINDA ekrana gelir
    const istekGovdesi = soruIstekGovdesiOlustur(secim, currentQuestion?.question ?? null, gorulenSorular);
    const onyuklenen = bekleyenSoruRef.current;
    if (onyuklenen && onyuklenen.istekGovdesi === istekGovdesi) {
      bekleyenSoruRef.current = null;
      // Soru elde hazır ama SIFIR geri bildirimle "pat" değişince öğrenci
      // değişimi fark etmiyor → kısa bir geçiş anı yaşatılır: mevcut spinner
      // örtüsü ("Yeni soru üretiliyor...") + kilitli gövde 400ms görünür,
      // sonra yeni soru animasyonla girer. Hız hissi korunur, algı gelir.
      setIsGeneratingQuestion(true);
      setShowAnswer(false);
      setSelectedAnswer(null);
      setAcilanIpucu(0);
      setUstBeyinMetni(null);
      setBildirimDurumu(null);
      setHataMesaji(null);
      setTimeout(() => {
        soruGosterVeOnyukle(onyuklenen.soru, secim, gorulenSorular);
        setIsGeneratingQuestion(false);
      }, 400);
      return;
    }
    // Eşleşmeyen ön-yükleme bayattır (seçim/ekran değişti) → at
    bekleyenSoruRef.current = null;

    setIsGeneratingQuestion(true);
    setShowAnswer(false);
    setSelectedAnswer(null);
    // Yeni soru için ipucu/Üst Beyin/bildirim state'leri taze başlar
    setAcilanIpucu(0);
    setUstBeyinMetni(null);
    setBildirimDurumu(null);
    setHataMesaji(null);

    try {
      const response = await authFetch('/api/questions/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: istekGovdesi,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Sunucu hatası' }));
        console.error('API Error:', errorData.error);
        setHataMesaji(`Soru alınamadı: ${errorData.error || 'Bilinmeyen hata'}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        soruGosterVeOnyukle(data.data as Question, secim, gorulenSorular);
      } else {
        console.error('API Error:', data.error);
        setHataMesaji(`Soru alınamadı: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Could not fetch question:', error);
      setHataMesaji('Bağlantı hatası — internet bağlantını kontrol edip tekrar deneyebilirsin.');
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // Branş-öncelikli hızlı başlatma: ders kartı tıklaması (tek türde doğrudan,
  // iki türde chooser üzerinden) buraya düşer.
  // ⚠️ Tutarlı Reset kuralı: ⚙️ detay penceresi dışındaki (ozellikler'siz)
  // her hızlı başlatma konuyu "Tümü (Karışık)" ve zorluğu "Orta" standartına
  // döndürür — kullanıcı başka derste 'İleri' seçmiş olsa bile yeni ders
  // 'Otomatik' (AI uyarlar) ile başlar; seçim asla yapışık kalmaz.
  const dersBaslat = (
    ders: string,
    tur: 'TYT' | 'AYT' | 'YDT',
    ozellikler?: { konu?: string; zorluk?: string }
  ) => {
    if (isGeneratingQuestion) return;
    const konu = ozellikler?.konu ?? '';
    const zorluk = ozellikler?.zorluk ?? 'otomatik';
    // selectAnswer state'ten okuduğu için istatistiğin doğru derse düşmesi
    // için state'leri çağrıdan ÖNCE set ediyoruz (aynı tikte batch'lenir)
    setExamType(tur);
    setSelectedSubject(ders);
    setSelectedTopic(konu);
    setSelectedDifficulty(zorluk);
    generateQuestion({ subject: ders, topic: konu, difficulty: zorluk, examType: tur });
  };

  // Ücretsiz Sokratik ipucu: bir sonrakini açar (çözüm ifşa etmez, yön gösterir)
  const ipucuAc = () => {
    const toplam = currentQuestion?.hints?.length ?? 0;
    setAcilanIpucu((n) => Math.min(n + 1, toplam));
  };

  // Üst Beyin (Özel Hoca): 1 kredi karşılığı adım adım derin anlatım.
  // 402 CREDIT_EXHAUSTED → kota bilgilendirmesi (ödeme akışı kullanıcı isterse)
  const ustBeyinIste = async () => {
    // Handler guard: id yoksa / istek sürüyorsa / anlatım zaten varsa dokunma
    if (!currentQuestion?.id || ustBeyinIstiyor || ustBeyinMetni) return;
    setUstBeyinIstiyor(true);
    setHataMesaji(null);
    try {
      const response = await authFetch('/api/questions/solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_answer: selectedAnswer,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Sunucu hatası' }));
        if (response.status === 402 && errorData.code === 'CREDIT_EXHAUSTED') {
          setQuotaExhausted({ periodEnd: errorData.data?.period_end ?? null });
          return;
        }
        console.error('API Error:', errorData.error);
        setHataMesaji(`Üst Beyin anlatımı alınamadı: ${errorData.error || 'Bilinmeyen hata'}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUstBeyinMetni(data.data.solution);
        // Kredi sayacını güncelle (üst bardaki bakiye anında düşsün)
        if (typeof data.data.credits_remaining === 'number') {
          setSubscriptionSummary((prev) =>
            prev
              ? {
                  ...prev,
                  subscription: {
                    ...prev.subscription,
                    credits_remaining: data.data.credits_remaining,
                  },
                }
              : prev
          );
        }
      } else {
        console.error('API Error:', data.error);
        setHataMesaji(`Üst Beyin anlatımı alınamadı: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Could not fetch solution:', error);
      setHataMesaji('Bağlantı hatası — internet bağlantını kontrol edip tekrar deneyebilirsin.');
    } finally {
      setUstBeyinIstiyor(false);
    }
  };

  // Hatalı soru bildirimi: kitle kaynaklı kalite kontrolü (2. farklı bildirim → soru askıya alınır)
  const soruBildir = async () => {
    if (!currentQuestion?.id || bildiriliyor || bildirimDurumu) return;
    setBildiriliyor(true);
    setHataMesaji(null);
    try {
      const response = await authFetch('/api/questions/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: currentQuestion.id }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Sunucu hatası' }));
        console.error('API Error:', errorData.error);
        setHataMesaji(`Bildirim gönderilemedi: ${errorData.error || 'Bilinmeyen hata'}`);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setBildirimDurumu(data.data?.status === 'suspended' ? 'askida' : 'gonderildi');
      } else {
        setHataMesaji(`Bildirim gönderilemedi: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Could not report question:', error);
      setHataMesaji('Bağlantı hatası — internet bağlantını kontrol edip tekrar deneyebilirsin.');
    } finally {
      setBildiriliyor(false);
    }
  };

  const selectAnswer = async (index: number) => {
    // Yeni soru üretilirken eski soruya cevap kabul edilmez (mükerrer kayıt/yanlış state önlemi)
    if (showAnswer || isGeneratingQuestion) return;
    setSelectedAnswer(index);
    setShowAnswer(true);

    const isCorrect = index === (currentQuestion?.correctAnswer ?? -1);

    try {
      // First get current user
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        console.log('User not found');
        return;
      }

      // Save answer to database
      try {
        // Gerçek çözme süresi: soru ekrana geldiğinden cevap verilen ana kadar (saniye)
        // min 1: DB CHECK (time_spent > 0) — saniye altı cevapta 0 yazıp kaydı düşürme
        const timeSpentSeconds = Math.max(1, Math.round((Date.now() - questionStartedAtRef.current) / 1000));
        const answerRecord = await dbHelpers.saveAnswer({
          user_id: user.id,
          question_id: currentQuestion?.id || `temp_${Date.now()}`,
          selected_answer: index,
          is_correct: isCorrect,
          time_spent: timeSpentSeconds,
        });

        if (answerRecord.error) {
          console.log('Could not save answer:', answerRecord.error);
        } else {
          console.log('Answer saved successfully');
          // "Son Çözülenler" panelini tazele (yeni cevap listede anında görünsün)
          try {
            const recentData = await dbHelpers.getRecentAnswers(user.id);
            if (recentData.data) {
              setRecentAnswers(recentData.data as unknown as RecentAnswer[]);
            }
          } catch (recentError) {
            console.log('Son çözülenler tazelenemedi:', recentError);
          }
          // Seri kartını da tazele (bugünün cevabı seriye anında işlensin)
          guncelleGunlukSeri(user.id);
          // Cevaplanan klon varsa "Eksiklerini Kapat" banner'ından düşsün
          guncelleBekleyenKlonlar(user.id);
        }
      } catch (recordError) {
        console.log('Could not save answer, but updating statistics:', recordError);
        // Continue to update statistics even if recording fails
      }
    } catch (error) {
      console.error('Could not save answer:', error);
    }

    // Update statistics immediately
    const today = new Date().toISOString().split('T')[0];
    const updatedStatistics = { ...statistics };

    // Update general statistics
    updatedStatistics.toplamSoru += 1;
    if (isCorrect) {
      updatedStatistics.dogruCevap += 1;
    }
    updatedStatistics.basariOrani = Math.round((updatedStatistics.dogruCevap / updatedStatistics.toplamSoru) * 100);

    // Update weekly progress
    const dailyProgress = updatedStatistics.haftalıkIlerleme.find(d => d.tarih === today);
    if (dailyProgress) {
      dailyProgress.sorular += 1;
      if (isCorrect) {
        const newSuccessRate = Math.round(((dailyProgress.sorular - 1) * dailyProgress.basari + 100) / dailyProgress.sorular);
        dailyProgress.basari = newSuccessRate;
      } else {
        const newSuccessRate = Math.round(((dailyProgress.sorular - 1) * dailyProgress.basari + 0) / dailyProgress.sorular);
        dailyProgress.basari = newSuccessRate;
      }
    } else {
      updatedStatistics.haftalıkIlerleme.push({
        tarih: today,
        sorular: 1,
        basari: isCorrect ? 100 : 0
      });
    }

    // Update subject-based statistics (ders + sınav türü birlikte anahtar —
    // TYT Coğrafya ile AYT Coğrafya ayrı satırlarda tutulur)
    const subjectStat = updatedStatistics.dersler.find(d => d.ders === selectedSubject && d.examType === examType);
    if (subjectStat) {
      subjectStat.toplam += 1;
      if (isCorrect) {
        subjectStat.dogru += 1;
      }
      subjectStat.basari = Math.round((subjectStat.dogru / subjectStat.toplam) * 100);
    } else {
      updatedStatistics.dersler.push({
        ders: selectedSubject,
        examType: examType,
        toplam: 1,
        dogru: isCorrect ? 1 : 0,
        basari: isCorrect ? 100 : 0
      });
    }

    setStatistics(updatedStatistics);
  };

  const tabs = [
    { id: 'overview' as const, label: 'Genel Bakış' },
    { id: 'practiceRoom' as const, label: 'Dinamik Soru Bankası' },
    { id: 'coach' as const, label: 'Koç' },
    { id: 'hataSepeti' as const, label: 'Hata Sepeti' },
    { id: 'analysis' as const, label: 'Analizler' },
    { id: 'package' as const, label: 'Aboneliğim' },
    { id: 'settings' as const, label: 'Ayarlar' },
  ];

  return (
    <GoalsProvider>
    <UserPreferencesProvider>
    {/* Çift-oturum koruması: başka hesap bu sekmenin oturumunu devralırsa
        opak kilit + "Oturumunuz kapatıldı" + landing'e yönlendirme */}
    <SessionGuard />
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Üst Bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="w-full px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between md:mb-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Logo size="lg" />
              </Link>
            </div>

            {/* Sağ üst: kredi pill'i (masaüstü) + profil avatarı (Yol Haritası
                madde 1: belirgin çıkış butonu kaldırıldı — çıkış avatar menüsünde
                ince kırmızı link olarak yaşar) + mobil hamburger */}
            <div className="flex items-center gap-3">
              {subscriptionSummary?.subscription && (
                <button
                  onClick={() => setActiveTab('package')}
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-sm font-semibold transition-colors"
                  title="Aboneliğim sekmesine git"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.343a1 1 0 00-1.414 0l-.707.707a1 1 0 001.414 1.414l.707-.707a1 1 0 000-1.414zM10 7a3 3 0 100 6 3 3 0 000-6zM3 9a1 1 0 100 2h1a1 1 0 100-2H3zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1z" />
                  </svg>
                  {subscriptionSummary.subscription.credits_remaining} / {subscriptionSummary.subscription.credits_limit}
                </button>
              )}
              <ProfileAvatar
                userName={userName}
                planName={
                  subscriptionSummary?.subscription
                    ? PLANS[subscriptionSummary.subscription.plan].name
                    : null
                }
                creditsRemaining={subscriptionSummary?.subscription?.credits_remaining ?? null}
                creditsLimit={subscriptionSummary?.subscription?.credits_limit ?? null}
                onLogout={handleLogout}
              />
              <HamburgerButton
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                isOpen={isMobileMenuOpen}
              />
            </div>
          </div>

          {/* Sekmeler — yalnızca tablet/masaüstünde; mobilde hamburger menüden erişilir */}
          <div className="hidden md:flex gap-2 border-t border-gray-100 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2.5 lg:px-6 lg:py-3 text-sm lg:text-base font-medium transition-all relative rounded-t-lg whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Mobil Menü — dashboard içerikli (landing menüsü değil) */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <nav className="flex-1 px-6 py-8">
          {/* Sekmeler — yatay sekme barı mobilde gizli olduğundan gezinme buradan yapılır */}
          <ul className="space-y-2">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium flex items-center justify-between ${
                    activeTab === tab.id
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Divider — sekmelerden hesap işlemlerine */}
          <div className="my-6 border-t border-gray-200" />

          <ul className="space-y-2">
            {subscriptionSummary?.subscription && (
              <li>
                <button
                  onClick={() => {
                    setActiveTab('package');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all font-medium"
                >
                  <span>Kredilerim</span>
                  <span className="text-purple-700 font-semibold">
                    {subscriptionSummary.subscription.credits_remaining} / {subscriptionSummary.subscription.credits_limit}
                  </span>
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 text-sm font-normal text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Çıkış Yap
              </button>
            </li>
          </ul>
        </nav>
      </MobileMenu>

      <main className="w-full px-4 md:px-6 lg:px-8 py-8 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Genel Bakış Sekmesi */}
        {activeTab === 'overview' && (
          <div className="space-y-4 h-full flex flex-col">
            {/* Hoş Geldin Mesajı — solda karşılama, sağda hedef kutusu (üni üstte / bölüm altta).
                sm yerine min-[480px]: 640 altındaki laptop ekranları da (Windows %125-150 ölçekleme)
                yan yana düzende görür; gerçek telefonlar (360-480px) alt alta kalır. */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 flex flex-col min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {userName ? `Merhaba, ${userName}! 👋` : 'Yükleniyor...'}
                </h1>
                <p className="text-gray-600 text-sm">
                  Bugün sınav hazırlığına devam etmeye hazır mısın?
                </p>
              </div>
              {/* Hedef kutusu — Ayarlar > Sınav Hedefleri'nden real-time; boşsa Ayarlar'a götürür */}
              <HedefRozeti onHedefBelirle={() => setActiveTab('settings')} />
            </div>

            {/* İstatistik Kartları */}
            <StatisticsCards istatistikler={statistics} gunlukSeri={gunlukSeri} />

            {/* Hedefler + Geri Sayım — mobilde alt alta, lg'de yan yana */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <DailyGoals />
              <ExamCountdown />
            </div>
          </div>
        )}

        {/* Pratik Odası Sekmesi */}
        {activeTab === 'practiceRoom' && (
          <QuestionPractice
            examType={examType}
            DERS_KARTLARI={DERS_KARTLARI}
            ZORLUKLER={DIFFICULTIES}
            seciliDers={selectedSubject}
            seciliZorluk={selectedDifficulty}
            soruUretiliyor={isGeneratingQuestion}
            mevcutSoru={currentQuestion}
            cevapGoster={showAnswer}
            seciliCevap={selectedAnswer}
            dersBaslat={dersBaslat}
            soruUret={() => generateQuestion()}
            cevapSec={selectAnswer}
            sonCozulenler={recentAnswers}
            bekleyenKlonlar={bekleyenKlonlar}
            hataSepetineGit={() => setActiveTab('hataSepeti')}
            kayitIncele={reviewRecentAnswer}
            ipuclar={currentQuestion?.hints ?? []}
            acilanIpucu={acilanIpucu}
            ipucuAc={ipucuAc}
            ustBeyinMetni={ustBeyinMetni}
            ustBeyinIstiyor={ustBeyinIstiyor}
            ustBeyinIste={ustBeyinIste}
            bildirimDurumu={bildirimDurumu}
            bildiriliyor={bildiriliyor}
            soruBildir={soruBildir}
            hataMesaji={hataMesaji}
            hataKapat={() => setHataMesaji(null)}
            modalKapat={() => {
              setCurrentQuestion(null);
              setShowAnswer(false);
              setSelectedAnswer(null);
              setAcilanIpucu(0);
              setUstBeyinMetni(null);
              setBildirimDurumu(null);
              setHataMesaji(null);
            }}
          />
        )}

        {/* Koç Sekmesi — hedef puan + günlük saat + gerçek performans → günlük plan */}
        {activeTab === 'coach' && (
          <CoachPanel
            baslat={(ders, tur, zorluk) => {
              setActiveTab('practiceRoom');
              dersBaslat(ders, tur, { zorluk });
            }}
            gitAyarlara={() => setActiveTab('settings')}
          />
        )}

        {/* Hata Sepeti Sekmesi — dün yanlışlanan soruların telafi merkezi */}
        {activeTab === 'hataSepeti' && (
          <HataSepetiPanel
            bekleyenKlonlar={bekleyenKlonlar}
            coz={(klon) => {
              setActiveTab('practiceRoom');
              klonAc(klon);
            }}
          />
        )}

        {/* Analizler Sekmesi */}
        {activeTab === 'analysis' && <AnalysisPanel istatistikler={statistics} />}

        {/* Paketim Sekmesi */}
        {activeTab === 'package' && (
          <PackagePanel
            summary={subscriptionSummary}
            onUpgrade={(plan) => {
              setUpgradePlan(plan);
              setShowUpgradeModal(true);
            }}
          />
        )}

        {/* Ayarlar Sekmesi — isim değişince karşılama anında tazelenir */}
        {activeTab === 'settings' && (
          <SettingsPanel
            onNameChanged={(ad) => {
              setUserName(ad);
              try {
                localStorage.setItem('userName', ad);
              } catch {
                // storage yazılamadı → oturumluk kalır
              }
            }}
          />
        )}
      </main>

      {/* Yükseltme Modalı (kota bitişi veya Paketim'den açılır) */}
      {showUpgradeModal && (
        <UpgradeModal
          plan={upgradePlan}
          onClose={() => setShowUpgradeModal(false)}
          onClaimed={fetchSubscription}
        />
      )}

      {/* Kota bitişi bilgilendirmesi (yenileme tarihi + isteğe bağlı yükseltme) */}
      {quotaExhausted && (
        <QuotaExhaustedModal
          periodEnd={quotaExhausted.periodEnd}
          onClose={() => setQuotaExhausted(null)}
          onUpgrade={() => {
            setQuotaExhausted(null);
            setUpgradePlan('pro');
            setShowUpgradeModal(true);
          }}
        />
      )}

      {/* Çıkış yapılıyor ekranı */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full">
              <svg className="w-8 h-8 text-purple-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">Güvenli şekilde çıkış yapılıyor...</p>
            <p className="text-sm text-gray-600">Görüşmek üzere! 👋</p>
          </div>
        </div>
      )}
    </div>
    </UserPreferencesProvider>
    </GoalsProvider>
  );
}
