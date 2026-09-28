interface StatCard {
  baslik: string;
  deger: string | number;
  ikon: string;
  renk: string;
  stil?: string; // kart arka planı geçersiz kılma (ör. Günlük Seri'nin alev tonları)
}

interface StatisticsCardsProps {
  istatistikler: {
    toplamSoru: number;
    dogruCevap: number;
    basariOrani: number;
  };
}

export function StatisticsCards({ istatistikler }: StatisticsCardsProps) {
  const istatistikKartlari: StatCard[] = [
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
      // YER TUTUCU (kullanıcı kararı): seri, art arda aktif gün sayısı olarak aktivite
      // verisinden hesaplanacak — gerçek veriye bağlanmadan önce statik değerdir
      baslik: 'Günlük Seri',
      deger: '3 Gün',
      ikon: '🔥',
      renk: 'bg-orange-500',
      stil: 'bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200/70',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {istatistikKartlari.map((kart, index) => (
        <div key={index} className={`rounded-2xl shadow-sm p-3 ${kart.stil ?? 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${kart.stil ? 'text-orange-700' : 'text-gray-600'}`}>{kart.baslik}</p>
              <p className={`text-2xl font-bold ${kart.stil ? 'text-orange-900' : 'text-gray-900'}`}>{kart.deger}</p>
            </div>
            <div className={`w-10 h-10 ${kart.renk} rounded-lg flex items-center justify-center text-lg`}>
              {kart.ikon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
