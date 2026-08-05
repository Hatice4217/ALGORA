import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALGORA - AI Destekli Sınav Hazırlığı",
  description: "YKS ve LGS sınavlarına hazırlık için yapay zeka destekli kişiselleştirilmiş sorular, detaylı analizler ve sürekli ilerleme takibi.",
  keywords: ["YKS", "TYT", "AYT", "LGS", "sınav", "hazırlık", "AI", "yapay zeka", "öğrenme", "eğitim"],
  authors: [{ name: "ALGORA" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "ALGORA - AI Destekli Sınav Hazırlığı",
    description: "YKS ve LGS sınavlarına yapay zeka ile hazırlanın",
    type: "website",
    locale: "tr_TR",
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
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
