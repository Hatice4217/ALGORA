'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { MobileMenu, HamburgerButton } from '../../components/MobileMenu';
import { getSubjectColor } from '../../lib/utils';
import { authHelpers, dbHelpers } from '../../lib/supabase';

// Mock veriler - API çağrıları ile değiştirilecek
const mockIstatistikler = {
  toplamSoru: 24,
  dogruCevap: 18,
  basariOrani: 75,
  ortalamaSüre: 42,
  dersler: [
    { ders: 'Matematik', toplam: 12, dogru: 8, basari: 67 },
    { ders: 'Türkçe', toplam: 8, dogru: 7, basari: 88 },
    { ders: 'Fizik', toplam: 4, dogru: 3, basari: 75 },
  ],
  haftalıkIlerleme: [], // Dinamik olarak güncellenecek
  gelisimGerekenler: ['Matematik'],
  gucluAlanlar: ['Türkçe', 'Fizik'],
};

const DERSLER = [
  'Matematik',
  'Türkçe',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü',
];

const ZORLUKLER = [
  { deger: 'baslangic', etiket: 'Başlangıç' },
  { deger: 'orta', etiket: 'Orta' },
  { deger: 'ileri', etiket: 'İleri' },
];

export default function DashboardPage() {
  const [aktifSekme, setAktifSekme] = useState<'genelBakis' | 'pratikOdasi' | 'analizler'>('genelBakis');
  const [istatistikler, setIstatistikler] = useState(mockIstatistikler);
  const [seciliDers, setSeciliDers] = useState('Matematik');
  const [seciliZorluk, setSeciliZorluk] = useState('baslangic');
  const [soruUretiliyor, setSoruUretiliyor] = useState(false);
  const [mevcutSoru, setMevcutSoru] = useState<any>(null);
  const [cevapGoster, setCevapGoster] = useState(false);
  const [seciliCevap, setSeciliCevap] = useState<number | null>(null);
  const [kullaniciAdi, setKullaniciAdi] = useState('Öğrenci');
  const [mobilMenuAcik, setMobilMenuAcik] = useState(false);

  // localStorage'dan çalışma kayıtlarını yükle
  const [calismaKayitlari, setCalismaKayitlari] = useState(() => {
    if (typeof window !== 'undefined') {
      const kayitliVeriler = localStorage.getItem('calismaKayitlari');
      if (kayitliVeriler) {
        return JSON.parse(kayitliVeriler);
      }
    }
    // Varsayılan demo veriler
    return [
      { id: 1, tarih: '02.08.2026', ders: 'Matematik', saat: 2, soru: 15 },
      { id: 2, tarih: '01.08.2026', ders: 'Türkçe', saat: 1.5, soru: 12 },
      { id: 3, tarih: '31.07.2026', ders: 'Fizik', saat: 1, soru: 8 },
    ];
  });

  const [yeniKayit, setYeniKayit] = useState({
    ders: '',
    saat: '',
    soru: ''
  });

  // Haftalık istatistikleri için state
  const [haftalikIstatistikleri, setHaftalikIstatistikleri] = useState({
    buHaftaToplamSaat: '3.5',
    buHaftaToplamSoru: 35,
    buGunToplam: '2.0'
  });

  // localStorage'a kaydet (çalışma kayıtları değişince)
  useEffect(() => {
    if (typeof window !== 'undefined' && calismaKayitlari.length > 0) {
      localStorage.setItem('calismaKayitlari', JSON.stringify(calismaKayitlari));

      // Haftalık istatistikleri güncelle
      const buHaftaToplamSaat = calismaKayitlari.reduce((toplam, kayit) => toplam + kayit.saat, 0);
      const buHaftaToplamSoru = calismaKayitlari.reduce((toplam, kayit) => toplam + kayit.soru, 0);
      const buGunToplam = calismaKayitlari
        .filter(k => k.tarih === calismaKayitlari[0]?.tarih)
        .reduce((toplam, kayit) => toplam + kayit.saat, 0);

      setHaftalikIstatistikleri({
        buHaftaToplamSaat: buHaftaToplamSaat.toFixed(1),
        buHaftaToplamSoru,
        buGunToplam: buGunToplam.toFixed(1)
      });
    }
  }, [calismaKayitlari]);

  // Kullanıcı verilerini getir
  useEffect(() => {
    const verileriGetir = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (user) {
          const isim = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Öğrenci';
          setKullaniciAdi(isim);

          // Profil verilerini getir
          try {
            const profil = await dbHelpers.getUserProfile(user.id);
            if (profil && profil.data && profil.data.name) {
              setKullaniciAdi(profil.data.name);
            }
          } catch (profilHata) {
            console.log('Profil bulunamadı, metadata kullanılıyor');
          }

          // İstatistikleri getir
          try {
            const istatistikVerisi = await dbHelpers.getUserStats(user.id);
            if (!istatistikVerisi.error && istatistikVerisi.data) {
              const istatistik = istatistikVerisi.data;
              setIstatistikler({
                toplamSoru: istatistik.total_questions || 0,
                dogruCevap: istatistik.correct_answers || 0,
                basariOrani: istatistik.total_questions > 0
                  ? Math.round((istatistik.correct_answers / istatistik.total_questions) * 100)
                  : 0,
                ortalamaSüre: istatistik.average_time || 0,
                dersler: [],
                haftalıkIlerleme: [],
                gelisimGerekenler: [],
                gucluAlanlar: [],
              });
            } else {
              console.log('İstatistikler bulunamadı veya hata var, varsayılan değerler kullanılıyor');
            }
          } catch (istatistikHata) {
            console.log('İstatistikler getirilemedi, varsayılan değerler kullanılıyor:', istatistikHata);
            // İstatistikler bulunamazsa boş değerlerle devam et
          }

          // Ders bazlı performansı getir
          try {
            const dersBazliVerisi = await dbHelpers.getSubjectBreakdown(user.id);
            if (dersBazliVerisi.data && dersBazliVerisi.data.length > 0) {
              const dersBazli = dersBazliVerisi.data.map((ders: any) => ({
                ders: ders.subject,
                toplam: ders.total_questions || 0,
                dogru: ders.correct_answers || 0,
                basari: ders.total_questions > 0
                  ? Math.round((ders.correct_answers / ders.total_questions) * 100)
                  : 0,
              }));

              setIstatistikler((onceki: any) => ({
                ...onceki,
                dersler: dersBazli,
              }));
            }
          } catch (dersHata) {
            console.log('Ders bazlı performans bulunamadı, boş kullanılıyor:', dersHata);
            // Ders bazlı performans bulunamazsa boş değerlerle devam et
          }
        }
      } catch (hata) {
        console.error('Veriler getirilemedi:', hata);
      }
    };

    verileriGetir();
  }, []);

  const soruUret = async () => {
    setSoruUretiliyor(true);
    setCevapGoster(false);
    setSeciliCevap(null);

    try {
      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: seciliDers,
          topic: 'Genel',
          difficulty: seciliZorluk,
          exam_type: 'TYT',
        }),
      });

      if (!response.ok) {
        const hataVerisi = await response.json().catch(() => ({ hata: 'Sunucu hatası' }));
        console.error('API Hatası:', hataVerisi.hata);
        alert(`Soru üretilemedi: ${hataVerisi.hata || 'Bilinmeyen hata'}`);
        return;
      }

      const veri = await response.json();
      if (veri.success) {
        setMevcutSoru(veri.data);
      } else {
        console.error('API Hatası:', veri.hata);
        alert(`Soru üretilemedi: ${veri.hata || 'Bilinmeyen hata'}`);
      }
    } catch (hata) {
      console.error('Soru üretilemedi:', hata);
      alert('Soru üretirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSoruUretiliyor(false);
    }
  };

  const cevapSec = async (index: number) => {
    if (cevapGoster) return;
    setSeciliCevap(index);
    setCevapGoster(true);

    const dogruMu = index === mevcutSoru.correctAnswer;

    try {
      // Önce mevcut kullanıcıyı al
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        console.log('Kullanıcı bulunamadı');
        return;
      }

      // Cevabı veritabanına kaydet
      try {
        const cevapKayit = await dbHelpers.saveAnswer({
          user_id: user.id,
          question_id: mevcutSoru.id || `temp_${Date.now()}`,
          selected_answer: index,
          is_correct: dogruMu,
          time_spent: 30, // Mock değer, gerçek zamanlayıcı gerekli
        });

        if (cevapKayit.error) {
          console.log('Cevap kaydedilemedi:', cevapKayit.error);
        } else {
          console.log('Cevap başarıyla kaydedildi');
        }
      } catch (kayitHata) {
        console.log('Cevap kaydedilemedi, ancak istatistikler güncelleniyor:', kayitHata);
        // Kayıt hatası olsa bile istatistikleri güncellemeye devam et
      }
    } catch (hata) {
      console.error('Cevap kaydedilemedi:', hata);
    }

    // İstatistikleri anında güncelle
    const bugun = new Date().toISOString().split('T')[0];
    const yeniIstatistikler = { ...istatistikler };

    // Genel istatistikleri güncelle
    yeniIstatistikler.toplamSoru += 1;
    if (dogruMu) {
      yeniIstatistikler.dogruCevap += 1;
    }
    yeniIstatistikler.basariOrani = Math.round((yeniIstatistikler.dogruCevap / yeniIstatistikler.toplamSoru) * 100);

    // Haftalık ilerlemeyi güncelle
    const gunlukIlerleme = yeniIstatistikler.haftalıkIlerleme.find(g => g.tarih === bugun);
    if (gunlukIlerleme) {
      gunlukIlerleme.sorular += 1;
      if (dogruMu) {
        const yeniBasari = Math.round(((gunlukIlerleme.sorular - 1) * gunlukIlerleme.basari + 100) / gunlukIlerleme.sorular);
        gunlukIlerleme.basari = yeniBasari;
      } else {
        const yeniBasari = Math.round(((gunlukIlerleme.sorular - 1) * gunlukIlerleme.basari + 0) / gunlukIlerleme.sorular);
        gunlukIlerleme.basari = yeniBasari;
      }
    } else {
      yeniIstatistikler.haftalıkIlerleme.push({
        tarih: bugun,
        sorular: 1,
        basari: dogruMu ? 100 : 0
      });
    }

    // Ders bazlı istatistikleri güncelle
    const dersIstatistigi = yeniIstatistikler.dersler.find(d => d.ders === seciliDers);
    if (dersIstatistigi) {
      dersIstatistigi.toplam += 1;
      if (dogruMu) {
        dersIstatistigi.dogru += 1;
      }
      dersIstatistigi.basari = Math.round((dersIstatistigi.dogru / dersIstatistigi.toplam) * 100);
    } else {
      yeniIstatistikler.dersler.push({
        ders: seciliDers,
        toplam: 1,
        dogru: dogruMu ? 1 : 0,
        basari: dogruMu ? 100 : 0
      });
    }

    setIstatistikler(yeniIstatistikler);
  };

  const istatistikKartlari = [
    {
      baslik: 'Toplam Soru',
      deger: istatistikler.toplamSoru,
      ikon: '📝',
      renk: 'bg-blue-500',
    },
    {
      baslik: 'Doğru Cevap',
      deger: istatistikler.dogruCevap,
      ikon: '✅',
      renk: 'bg-green-500',
    },
    {
      baslik: 'Başarı Oranı',
      deger: `%${istatistikler.basariOrani}`,
      ikon: '🎯',
      renk: 'bg-purple-500',
    },
    {
      baslik: 'Ortalama Süre',
      deger: `${istatistikler.ortalamaSüre}s`,
      ikon: '⏱️',
      renk: 'bg-orange-500',
    },
  ];

  const sekmeler = [
    { id: 'genelBakis' as const, etiket: 'Genel Bakış' },
    { id: 'pratikOdasi' as const, etiket: 'Pratik Odası' },
    { id: 'analizler' as const, etiket: 'Analizler' },
  ];

  // Çalışma kaydı ekleme fonksiyonu
  const calismaKaydiEkle = () => {
    if (yeniKayit.ders && yeniKayit.saat && yeniKayit.soru) {
      const bugun = new Date();
      const gun = String(bugun.getDate()).padStart(2, '0');
      const ay = String(bugun.getMonth() + 1).padStart(2, '0');
      const yil = bugun.getFullYear();

      const kayit = {
        id: Date.now(),
        tarih: `${gun}.${ay}.${yil}`,
        ders: yeniKayit.ders,
        saat: parseFloat(yeniKayit.saat),
        soru: parseInt(yeniKayit.soru)
      };

      setCalismaKayitlari([kayit, ...calismaKayitlari]);
      setYeniKayit({ ders: '', saat: '', soru: '' });
    }
  };

  const calismaKaydiSil = (id: number) => {
    setCalismaKayitlari(calismaKayitlari.filter(kayit => kayit.id !== id));
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Üst Bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Logo size="lg" />
              </Link>
            </div>

            {/* Masaüstü Çıkış Butonu */}
            <div className="hidden md:block">
              <Button variant="outline" size="md">
                Çıkış Yap
              </Button>
            </div>

            {/* Mobil Hamburger Butonu */}
            <HamburgerButton
              onClick={() => setMobilMenuAcik(!mobilMenuAcik)}
              isOpen={mobilMenuAcik}
            />
          </div>

          {/* Sekmeler - Üst Barın Altında */}
          <div className="flex gap-2 border-t border-gray-100 pt-4">
            {sekmeler.map((sekme) => (
              <button
                key={sekme.id}
                onClick={() => setAktifSekme(sekme.id)}
                className={`px-6 py-3 font-medium transition-all relative rounded-t-lg ${
                  aktifSekme === sekme.id
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
                }`}
              >
                {sekme.etiket}
                {aktifSekme === sekme.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Mobil Menü */}
      <MobileMenu
        isOpen={mobilMenuAcik}
        onClose={() => setMobilMenuAcik(false)}
      />

      <div className="container mx-auto px-6 py-8 flex-1 overflow-hidden">
        {/* Genel Bakış Sekmesi */}
        {aktifSekme === 'genelBakis' && (
          <div className="space-y-4 h-full flex flex-col">
            {/* Hoş Geldin Mesajı */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Merhaba, {kullaniciAdi}! 👋
              </h1>
              <p className="text-gray-600 text-sm">
                Bugün sınav hazırlığına devam etmeye hazır mısın?
              </p>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {istatistikKartlari.map((kart, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-sm p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">{kart.baslik}</p>
                      <p className="text-2xl font-bold text-gray-900">{kart.deger}</p>
                    </div>
                    <div className={`w-10 h-10 ${kart.renk} rounded-lg flex items-center justify-center text-lg`}>
                      {kart.ikon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Çalışma Kayıtları */}
            <div className="bg-white rounded-2xl shadow-sm p-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Çalışma Kayıtları</h3>
                <div className="text-sm text-gray-500">
                  Bu Hafta: {haftalikIstatistikleri.buHaftaToplamSaat} saat | {haftalikIstatistikleri.buHaftaToplamSoru} soru
                </div>
              </div>

              {/* Yeni Kayıt Ekleme Formu */}
              <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Ders"
                    value={yeniKayit.ders}
                    onChange={(e) => setYeniKayit({...yeniKayit, ders: e.target.value})}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <input
                    type="number"
                    placeholder="Saat"
                    value={yeniKayit.saat}
                    onChange={(e) => setYeniKayit({...yeniKayit, saat: e.target.value})}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-purple-500"
                    step="0.5"
                  />
                  <input
                    type="number"
                    placeholder="Soru"
                    value={yeniKayit.soru}
                    onChange={(e) => setYeniKayit({...yeniKayit, soru: e.target.value})}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={calismaKaydiEkle}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-base font-medium transition-all"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Excel Tablosu - Scroll Alanı */}
              <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-scroll flex-1" style={{ scrollbarWidth: 'auto', scrollbarGutter: 'stable' }}>
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider w-28">Tarih</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider w-32">Ders</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider w-24">Saat</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider w-24">Soru</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 uppercase tracking-wider w-20">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {calismaKayitlari.map((kayit) => (
                        <tr key={kayit.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-base text-gray-900">{kayit.tarih}</td>
                          <td className="px-4 py-3 text-base text-gray-900">{kayit.ders}</td>
                          <td className="px-4 py-3 text-base text-gray-600">{kayit.saat} saat</td>
                          <td className="px-4 py-3 text-base text-gray-600">{kayit.soru} soru</td>
                          <td className="px-4 py-3 text-right text-base">
                            <button
                              onClick={() => calismaKaydiSil(kayit.id)}
                              className="text-red-600 hover:text-red-700 font-medium text-base"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pratik Odası Sekmesi */}
        {aktifSekme === 'pratikOdasi' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              {!mevcutSoru ? (
                <div className="p-8">
                  <h2 className="text-xl font-light text-slate-800 mb-2 tracking-wide">
                    Soru Çözmeye Başla
                  </h2>
                  <p className="text-slate-500 mb-6 text-sm">
                    Çalışmak istediğin ders ve zorluk seviyesini seç
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2 tracking-wide uppercase">
                        Ders Seç
                      </label>
                      <select
                        value={seciliDers}
                        onChange={(e) => setSeciliDers(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                      >
                        {DERSLER.map((ders) => (
                          <option key={ders} value={ders}>
                            {ders}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2 tracking-wide uppercase">
                        Zorluk Seviyesi
                      </label>
                      <select
                        value={seciliZorluk}
                        onChange={(e) => setSeciliZorluk(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                      >
                        {ZORLUKLER.map((zorluk) => (
                          <option key={zorluk.deger} value={zorluk.deger}>
                            {zorluk.etiket}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={soruUret}
                      disabled={soruUretiliyor}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {soruUretiliyor ? 'Üretiliyor...' : 'Soru Üret'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getSubjectColor(seciliDers)} text-white`}>
                        {seciliDers}
                      </span>
                      <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-100 text-slate-600">
                        {seciliZorluk === 'baslangic' ? 'Başlangıç' : seciliZorluk === 'orta' ? 'Orta' : 'İleri'}
                      </span>
                    </div>
                    <h3 className="text-lg font-light text-slate-800 mb-4">
                      {mevcutSoru.question}
                    </h3>
                  </div>

                  <div className="space-y-2">
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
                          disabled={cevapGoster}
                          className={`w-full p-3 text-left border rounded-lg transition-all ${butonSinifi}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs ${
                              cevapGoster && index === mevcutSoru.correctAnswer
                                ? 'bg-emerald-500 text-white'
                                : cevapGoster && index === seciliCevap && index !== mevcutSoru.correctAnswer
                                ? 'bg-red-400 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="flex-1 text-sm text-slate-700">{secenek}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {cevapGoster && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <h4 className="font-medium text-slate-800 mb-1 text-sm">Açıklama</h4>
                      <p className="text-slate-600 text-sm">{mevcutSoru.explanation}</p>
                    </div>
                  )}

                  <button
                    onClick={soruUret}
                    disabled={soruUretiliyor}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {soruUretiliyor ? 'Üretiliyor...' : 'Sıradaki Soru'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analizler Sekmesi */}
        {aktifSekme === 'analizler' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Güçlü Olduğun Alanlar */}
            {istatistikler.gucluAlanlar.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">💪</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">Güçlü Olduğun Alanlar</h3>
                </div>
                <div className="space-y-3">
                  {istatistikler.gucluAlanlar.map((alan) => (
                    <div key={alan} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${getSubjectColor(alan)}`}></div>
                      <span className="text-gray-700 font-medium">{alan}</span>
                      <span className="ml-auto text-green-600 text-sm font-medium">İyi</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div className="text-slate-400 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Güçlü alanların belirlenmedi</h3>
                <p className="text-gray-600 text-sm">
                  Soru çözmeye başladığında güçlü olduğunu alanların burada görünecek
                </p>
              </div>
            )}

            {/* Gelişim Gereken Alanlar */}
            {istatistikler.gelisimGerekenler.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">📈</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">Gelişim Gereken Alanlar</h3>
                </div>
                <div className="space-y-3">
                  {istatistikler.gelisimGerekenler.map((alan) => (
                    <div key={alan} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${getSubjectColor(alan)}`}></div>
                      <span className="text-gray-700 font-medium">{alan}</span>
                      <span className="ml-auto text-orange-600 text-sm font-medium">Çalışma gerekli</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div className="text-slate-400 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Gelişim alanların belirlenmedi</h3>
                <p className="text-gray-600 text-sm">
                  Soru çözmeye başladığında gelişim gerektiren alanların burada görünecek
                </p>
              </div>
            )}

            {/* Ders Bazlı Detaylı İstatistikler */}
            {istatistikler.dersler.length > 0 ? (
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Ders Bazlı Performans</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {istatistikler.dersler.map((ders) => (
                    <div key={ders.ders} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{ders.ders}</span>
                        <span className={`text-sm font-medium ${
                          ders.basari >= 80 ? 'text-green-600' :
                          ders.basari >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          %{ders.basari}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{ders.dogru}/{ders.toplam} doğru</span>
                      </div>
                      <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            ders.basari >= 80 ? 'bg-green-500' :
                            ders.basari >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${ders.basari}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-8 text-center">
                <div className="text-slate-400 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Henüz ders verisi yok</h3>
                <p className="text-gray-600 text-sm">
                  Soru çözmeye başladığında ders bazlı performansın burada görünecek
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
