import type { Metadata } from 'next';
import { Libre_Franklin, Libre_Baskerville } from 'next/font/google';
import './globals.css';

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-libre-franklin',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  variable: '--font-libre-baskerville',
  display: 'swap',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Chazer — Autonomous Accounts Receivable Agent',
  description: 'Autonomous multi-tier invoice escalation and collection agent for freelancers and agencies.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${libreFranklin.variable} ${libreBaskerville.variable}`}>
      <body className="font-sans bg-surface-base text-[#F0F0F5] antialiased selection:bg-chazer-purple selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
