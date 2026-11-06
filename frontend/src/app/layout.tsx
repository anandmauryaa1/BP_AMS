import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { RealTimeProvider } from '@/context/RealTimeContext';

export const metadata: Metadata = {
  title: 'Blindera Productions - Attendance & Production Management',
  description: 'Official Attendance, Shift Roster, Tasks, and Payroll Management System for Blindera Productions',
  manifest: '/manifest.json',
  applicationName: 'Blindera AMS',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Blindera AMS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-150">
        <ThemeProvider>
          <RealTimeProvider>
            <ServiceWorkerRegister />
            <PwaInstallPrompt />
            {children}
          </RealTimeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

