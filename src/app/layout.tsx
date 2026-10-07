import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const instrumentSans = Instrument_Sans({ variable: '--font-instrument-sans', subsets: ['latin'] });

const title = 'InsightDesk · Ask your business data anything';
const description = 'Upload a CSV and ask questions in plain English. Get instant answers, charts and automatic insights. Your data stays in your browser.';

export const metadata: Metadata = {
  title,
  description,
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.svg` },
  openGraph: { title, description, type: 'website' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
