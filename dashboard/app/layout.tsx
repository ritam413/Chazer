import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chazer — Autonomous Accounts Receivable & Escalation Engine',
  description: 'Autonomous multi-tier invoice escalation and collection agent for freelancers and agencies.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-periwinkle-mist selection:text-off-black min-h-screen font-mono">
        {children}
      </body>
    </html>
  );
}
