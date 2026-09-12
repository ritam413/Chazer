import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className="bg-surface-base text-[#F0F0F5] antialiased selection:bg-chazer-purple selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
