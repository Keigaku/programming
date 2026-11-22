import type { Metadata } from 'next';
import {
  JetBrains_Mono,
  Noto_Sans_JP,
  Shippori_Mincho,
} from 'next/font/google';
import { SITE_CONFIG } from '@/config/site';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const shipporiMincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.name}｜楽天ポイント還元 × Amazon公式特典 実質最安比較メディア`,
    template: `%s｜${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name}｜${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: [{ url: '/images/hero-editorial.jpg', width: 1408, height: 768 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_CONFIG.name}｜${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: ['/images/hero-editorial.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${shipporiMincho.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <SiteHeader />
        <main className="site-main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
