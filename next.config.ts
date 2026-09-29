import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundle size
  // Güvenlik header'ları (HSTS Vercel tarafından zaten ekleniyor)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js inline bootstrap script'leri ve style'ları için unsafe-inline şart
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // Google profil fotoğrafları + Supabase storage
              "img-src 'self' data: https://lh3.googleusercontent.com https://*.supabase.co",
              // next/font fontları self-host'lar; data: ikonlar için
              "font-src 'self' data:",
              // Supabase REST + auth (+ realtime için wss)
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  // NOT: Eski webpack console-silme bloğu silindi — Next 16 build'i Turbopack
  // kullanır ve `webpack` bölümünü yok sayar (hiç çalışmıyordu; regex'li asset
  // manipülasyonu zaten kırılgandı).
};

export default nextConfig;
