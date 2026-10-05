// Faz 2 pedagoji: Ders Başarı Radarı — saf SVG, state/effect yok, pure hesap.
// Veri mevcut `istatistikler.dersler` prop'undan gelir (yeni sorgu YOK).
// BAP formunda vaat edilen radar grafiğinin karşılığıdır.

interface RadarEksemi {
  etiket: string;
  basari: number;
  // >8 eksen guard'ında "en çok soru çözülen" seçimi için (opsiyonel)
  toplam?: number;
}

interface RadarGrafigiProps {
  eksenler: RadarEksemi[];
}

// viewBox geometrisi: merkez (170,140), R=100 — etiketler için üstte 140,
// altta 160 px pay kalır (330'a kadar taşma yok)
const MERKEZ_X = 170;
const MERKEZ_Y = 140;
const R = 100;
const ETIKET_R = R + 14; // etiketler poligonun 14px dışında
const GRID_ADIMLARI = [25, 50, 75, 100];

// Kutupsal → kartezyen (0° = yukarı, saat yönünde)
function polar(r: number, derece: number): { x: number; y: number } {
  const radyan = (derece * Math.PI) / 180;
  return { x: MERKEZ_X + r * Math.cos(radyan), y: MERKEZ_Y + r * Math.sin(radyan) };
}

// n eksenli düzgün poligonun points attribute değeri
function cokgenNoktalari(r: number, adet: number): string {
  return Array.from({ length: adet }, (_, i) => polar(r, -90 + (360 / adet) * i))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}

export function RadarGrafigi({ eksenler }: RadarGrafigiProps) {
  // Guard 1: <3 eksen → düzgün poligon çizilemez → boş durum kartı
  if (eksenler.length < 3) {
    return (
      <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center py-8 px-4">
        <span className="text-3xl mb-2">📡</span>
        <p className="text-sm font-medium text-gray-700">
          Radar grafiği için en az 3 farklı ders verisi gerekli
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Farklı derslerden soru çözdükçe başarı profilin burada şekillenecek
        </p>
      </div>
    );
  }

  // Guard 2: >8 eksen → okunabilirlik tavanı; en çok soru çözülen 8'i kalır,
  // seçimden sonra Orijinal sıra korunur (eksen zıplamasın)
  const sinirAsimi = eksenler.length > 8;
  const gosterilen = sinirAsimi
    ? eksenler
        .map((e, i) => ({ ...e, i }))
        .sort((a, b) => (b.toplam ?? 0) - (a.toplam ?? 0))
        .slice(0, 8)
        .sort((a, b) => a.i - b.i)
    : eksenler;

  const n = gosterilen.length;

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 340 300"
        className="w-full h-auto"
        role="img"
        aria-label="Ders bazlı başarı radarı"
      >
        {/* Izgara poligonları: %25/%50/%75/%100 halkaları */}
        {GRID_ADIMLARI.map((yuzde) => (
          <polygon
            key={yuzde}
            points={cokgenNoktalari((R * yuzde) / 100, n)}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}

        {/* Eksen çizgileri: merkezden dış halkaya */}
        {gosterilen.map((_, i) => {
          const p = polar(R, -90 + (360 / n) * i);
          return (
            <line
              key={i}
              x1={MERKEZ_X}
              y1={MERKEZ_Y}
              x2={p.x}
              y2={p.y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Değer poligonu — gerçek başarı yüzdeleri */}
        <polygon
          points={gosterilen
            .map(
              (e, i) =>
                polar((R * Math.min(Math.max(e.basari, 0), 100)) / 100, -90 + (360 / n) * i)
            )
            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ')}
          fill="rgba(168,85,247,0.2)"
          stroke="#a855f7"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Tepe noktaları */}
        {gosterilen.map((e, i) => {
          const p = polar((R * Math.min(Math.max(e.basari, 0), 100)) / 100, -90 + (360 / n) * i);
          return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#a855f7" />;
        })}

        {/* Eksen etiketleri + başarı yüzdesi (tspan ile ikinci satır) */}
        {gosterilen.map((e, i) => {
          const derece = -90 + (360 / n) * i;
          const radyan = (derece * Math.PI) / 180;
          const p = polar(ETIKET_R, derece);
          // Yatay konuma göre hizalama: sağ → start, sol → end, tepe/dip → middle
          const cos = Math.cos(radyan);
          const sin = Math.sin(radyan);
          const anchor = cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle';
          const dy = sin < -0.7 ? 0 : sin > 0.7 ? 14 : 5;
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor={anchor}
              dy={dy}
              fontSize={10}
              fill="#475569"
            >
              {e.etiket}
              <tspan x={p.x} dy={11} fontSize={10} fontWeight={700} fill="#a855f7">
                %{e.basari}
              </tspan>
            </text>
          );
        })}
      </svg>

      {sinirAsimi && (
        <p className="text-xs text-slate-400 text-center mt-1">
          En çok soru çözülen 8 ders gösteriliyor.
        </p>
      )}
    </div>
  );
}
