import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false, // Mono font less critical, lazy load
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: "ALGORA - AI Destekli Sınav Hazırlığı",
  description: "YKS ve LGS sınavlarına hazırlık için yapay zeka destekli kişiselleştirilmiş sorular, detaylı analizler ve sürekli ilerleme takibi.",
  keywords: ["YKS", "TYT", "AYT", "LGS", "sınav", "hazırlık", "AI", "yapay zeka", "öğrenme", "eğitim"],
  authors: [{ name: "ALGORA" }],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "ALGORA - AI Destekli Sınav Hazırlığı",
    description: "YKS ve LGS sınavlarına yapay zeka ile hazırlanın",
    type: "website",
    locale: "tr_TR",
  },
  other: {
    // No duplicate DNS hints - using preconnect in head instead
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Resource hints for critical path optimization - no duplicates */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Critical CSS inline - prevents render blocking, optimized size */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS for above-the-fold content - optimized */
            body{background:#fff;color:#171717;font-family:Arial,Helvetica,sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
            .scroll-lock{overflow:hidden;contain:strict}
            .container{max-width:1200px;margin:0 auto;padding:0 1.5rem}
            .flex{display:flex}.items-center{align-items:center}.justify-between{justify-content:space-between}
            .gap-3{gap:0.75rem}.gap-4{gap:1rem}.gap-8{gap:2rem}
            .text-purple-600{color:#9333ea}.text-gray-900{color:#111827}.text-gray-600{color:#4b5563}
            .font-bold{font-weight:700}.text-5xl{font-size:3rem;line-height:1}.text-xl{font-size:1.25rem}
            .mb-4{margin-bottom:1rem}.mb-6{margin-bottom:1.5rem}.mb-8{margin-bottom:2rem}
            .py-4{padding-top:1rem;padding-bottom:1rem}.py-20{padding-top:5rem;padding-bottom:5rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}
            @media (max-width:768px){.hidden{display:none}}
          `
        }} />

        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
