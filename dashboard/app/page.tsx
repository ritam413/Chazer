import Link from 'next/link';
import { ArrowRight, Bot, ShieldAlert, Sparkles, ReceiptText } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl w-full glass-card p-10 flex flex-col items-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-chazer-purple/20 text-chazer-purple-light border border-chazer-purple/30 shadow-purple-glow">
          <Bot className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl font-sans">
            Chazer
          </h1>
          <p className="text-xs font-semibold text-chazer-purple-light uppercase tracking-wider font-sans">
            Autonomous Accounts Receivable Agent
          </p>
        </div>

        <p className="text-base sm:text-lg text-[#A0A0B8] max-w-lg leading-relaxed font-serif">
          Level-3 autonomous collections agent that recovers overdue invoices with calm authority, graduated tone escalation, and human-in-the-loop decision safeguards.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-4 font-sans">
          <div className="p-4 rounded-lg bg-surface-elevated border border-border-subtle flex flex-col items-center text-center space-y-1">
            <ReceiptText className="w-5 h-5 text-tier1" />
            <span className="text-xs font-bold text-white">Tier 1 & 2 Auto</span>
            <span className="text-[11px] text-[#9090A8] font-serif">Friendly & firm follow-ups</span>
          </div>
          <div className="p-4 rounded-lg bg-surface-elevated border border-border-subtle flex flex-col items-center text-center space-y-1">
            <ShieldAlert className="w-5 h-5 text-tier3" />
            <span className="text-xs font-bold text-white">Human Safeguard</span>
            <span className="text-[11px] text-[#9090A8] font-serif">High-value & final notices</span>
          </div>
          <div className="p-4 rounded-lg bg-surface-elevated border border-border-subtle flex flex-col items-center text-center space-y-1">
            <Sparkles className="w-5 h-5 text-chazer-purple-light" />
            <span className="text-xs font-bold text-white">AI-Drafted</span>
            <span className="text-[11px] text-[#9090A8] font-serif">Contextualized email copy</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 w-full justify-center font-sans">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-chazer-purple hover:bg-chazer-purple-dark text-white font-semibold text-sm transition-all duration-200 shadow-purple-glow hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Dashboard
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
