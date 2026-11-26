import { ImageResponse } from 'next/og';

export const alt = 'Signet — цифровые визитки с QR-кодом';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background:
            'linear-gradient(165deg, #f7fafc 0%, #f5f8fb 45%, #eef3f8 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            color: '#0b1520',
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#0e9aa7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f5f8fb',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            S
          </div>
          Signet
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              color: '#0b1520',
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              maxWidth: 900,
            }}
          >
            Визитка, которая открывается с телефона
          </div>
          <div
            style={{
              color: '#5a6b7c',
              fontSize: 28,
              lineHeight: 1.35,
              maxWidth: 780,
            }}
          >
            Одна ссылка, QR и контакт в записной книжке
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
