interface StatCard {
  baslik: string;
  deger: string | number;
  ikon: string;
  renk: string;
}

interface StatisticsCardsProps {
  istatistikler: {
    toplamSoru: number;
    dogruCevap: number;
    basariOrani: number;
    ortalamaSüre: number;
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
      baslik: 'Ortalama Süre',
      deger: `${istatistikler.ortalamaSüre}s`,
      ikon: '⏱️',
      renk: 'bg-orange-500',
    },
  ];

  return (
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
  );
}
