import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const title = 'InsightDesk · Answers from your spreadsheets';
const description = 'Drop in a CSV and ask questions in plain English. Charts, automatic insights and a shareable dashboard, computed in your browser.';

export const metadata: Metadata = {
  title,
  description,
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.svg` },
  openGraph: { title, description, type: 'website' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster position="bottom-center" toastOptions={{ style: { background: '#09090b', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13 } }} />
      </body>
    </html>
  );
}
