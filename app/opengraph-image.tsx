import { ImageResponse } from 'next/og';

// OG görseli — link paylaşımlarında (WhatsApp/X/Discord) önizleme kartı.
// ImageResponse ile dinamik üretilir (görsel dosyası gerekmez). METİN
// KASİTLİ OLARAK ASCII: next/og'nin gömülü fontu yalnız latin subset —
// "ı/ş/ğ" kutu (tofu) çıkar; slogan Türkçe yazılamaz, ASCII metin seçildi.

export const alt = 'ALGORA - AI Destekli YKS Hazırlığı';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0a1e 0%, #1e1b4b 55%, #0e7490 130%)',
          position: 'relative',
        }}
      >
        {/* Sol üst mor ışıma */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: -120,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(147,51,234,0.35) 0%, rgba(147,51,234,0) 70%)',
            display: 'flex',
          }}
        />
        {/* Sağ alt camgöbeği ışıma */}
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: -140,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(6,182,212,0.28) 0%, rgba(6,182,212,0) 70%)',
            display: 'flex',
          }}
        />
        {/* Logo — gradient ALGORA yazısı */}
        <div
          style={{
            display: 'flex',
            fontSize: 128,
            fontWeight: 900,
            letterSpacing: 6,
            color: '#ffffff',
          }}
        >
          ALG
          <span style={{ color: '#c084fc', display: 'flex' }}>O</span>
          RA
        </div>
        {/* Rozet satırı */}
        <div style={{ display: 'flex', gap: 24, marginTop: 36 }}>
          {['TYT', 'AYT', 'YDT'].map((d) => (
            <div
              key={d}
              style={{
                display: 'flex',
                padding: '10px 28px',
                borderRadius: 9999,
                border: '2px solid rgba(192,132,252,0.6)',
                background: 'rgba(147,51,234,0.18)',
                color: '#e9d5ff',
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Alt satır (ASCII bilinçli) */}
        <div
          style={{
            display: 'flex',
            marginTop: 30,
            fontSize: 36,
            color: '#94a3b8',
          }}
        >
          🎯 YKS 2027
        </div>
      </div>
    ),
    { ...size }
  );
}
