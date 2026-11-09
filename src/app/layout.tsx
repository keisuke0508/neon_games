import type { Metadata, Viewport } from 'next';
import { M_PLUS_1p, Orbitron } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { LeaveGuardProvider } from '@/contexts/LeaveGuardContext';
import './globals.scss';

const mplus = M_PLUS_1p({
  weight: ['400', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mplus',
});

const orbitron = Orbitron({
  weight: ['600', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-orbitron',
});

export const metadata: Metadata = {
  title: {
    default: 'NEON_GAMES',
    template: '%s | NEON_GAMES',
  },
  description: 'ログイン不要、無料で遊べるゲームセンター。ダウンロード不要でブラウザからすぐに遊べます。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07070F',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={`${mplus.variable} ${orbitron.variable}`}>
      <body>
        <LeaveGuardProvider>
          <AppHeader />
          <main className="main">{children}</main>
          <AppFooter />
        </LeaveGuardProvider>
      </body>
    </html>
  );
}
