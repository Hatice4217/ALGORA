interface WorkRecord {
  id: number;
  tarih: string;
  ders: string;
  saat: number;
  soru: number;
}

interface WeeklyStats {
  buHaftaToplamSaat: string;
  buHaftaToplamSoru: number;
  buGunToplam: string;
}

interface NewRecord {
  ders: string;
  saat: string;
  soru: string;
}

interface WorkRecordsProps {
  calismaKayitlari: WorkRecord[];
  yeniKayit: NewRecord;
  haftalikIstatistikleri: WeeklyStats;
  setYeniKayit: (kayit: NewRecord) => void;
  calismaKaydiEkle: () => void;
  calismaKaydiSil: (id: number) => void;
}

export function WorkRecords({
  calismaKayitlari,
  yeniKayit,
  haftalikIstatistikleri,
  setYeniKayit,
  calismaKaydiEkle,
  calismaKaydiSil,
}: WorkRecordsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Çalışma Kayıtları</h2>
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
            onChange={(e) => setYeniKayit({ ...yeniKayit, ders: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <input
            type="number"
            placeholder="Saat"
            value={yeniKayit.saat}
            onChange={(e) => setYeniKayit({ ...yeniKayit, saat: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-purple-500"
            step="0.5"
          />
          <input
            type="number"
            placeholder="Soru"
            value={yeniKayit.soru}
            onChange={(e) => setYeniKayit({ ...yeniKayit, soru: e.target.value })}
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
  );
}
