import type { Metadata, Viewport } from 'next';

import { meta } from '@/content/site';
import '../styles/index.css';

/**
 * The document only, as on ruetcs.org. The public site's furniture lives in
 * `app/(site)/layout.tsx`; the dashboard pieces bring their own wrapper.
 * Starter kit: the club site's boot guard and analytics are left out, since
 * the kit has no preloader and is never deployed.
 */
export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon-32.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/Inter-Variable-Latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/JetBrainsMono-Variable-Latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
