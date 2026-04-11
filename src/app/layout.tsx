import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Timetable Workspace — Smart University Scheduling',
  description: 'A premium timetable management platform for universities and institutions.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Timetable'
  },
  formatDetection: {
    telephone: false
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={inter.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#08090e" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
