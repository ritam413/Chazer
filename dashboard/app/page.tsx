import Link from 'next/link';
import { ArrowRight, Bot, ShieldAlert, Sparkles, ReceiptText } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-periwinkle-mist selection:text-off-black transition-colors" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}>
      
      {/* Top Announcement Bar */}
      <div className="w-full text-xs py-2.5 px-6 sm:px-10 flex items-center justify-between" style={{ backgroundColor: 'var(--announcement-bg)', color: 'var(--announcement-text)' }}>
        <div className="max-w-[1432px] mx-auto w-full flex items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 uppercase text-[10px] tracking-mono-wide px-2 py-0.5 rounded-full bg-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse"></span>
              Level-3 Autonomous Collections
            </span>
            <span className="text-xs opacity-80 hidden sm:inline">Zero-Credit Free-Tier Architecture · Strands Agent Core</span>
          </div>
          <Link href="/dashboard" className="px-3 py-0.5 rounded-pill text-[10px] font-medium uppercase tracking-mono-tight hover:opacity-90 transition-all flex items-center gap-1" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}>
            <span>Enter App</span>
            <span>▸</span>
          </Link>
        </div>
      </div>

      {/* Header Navigation */}
      <header className="w-full border-b" style={{ borderColor: 'var(--border-card)' }}>
        <div className="max-w-[1432px] mx-auto px-6 sm:px-10 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--text-main)' }}>
              <span className="w-2.5 h-2.5 rounded-full bg-mint"></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-2xl tracking-serif-tight leading-none" style={{ color: 'var(--text-main)' }}>
                Chazer
              </span>
              <span className="text-[10px] font-mono uppercase tracking-mono-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                Vol. 01 / Technical Review
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-btn bg-lake-blue text-white text-xs uppercase tracking-mono-wide font-medium hover:opacity-95 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Launch Dashboard</span>
              <span>▸</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-[1432px] mx-auto w-full px-6 sm:px-10 py-16 space-y-16 flex-1 font-mono">
        
        <section className="space-y-6 max-w-4xl">
          <div className="text-xs uppercase tracking-mono-wide font-medium" style={{ color: 'var(--text-muted)' }}>
            Autonomous Accounts Receivable · Intelligent Chasing
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-editorial leading-tight tracking-serif-tight" style={{ color: 'var(--text-main)' }}>
            Recover overdue cashflow with deliberate restraint.
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-2xl pt-2" style={{ color: 'var(--text-sub)' }}>
            Chazer removes the social discomfort and inconsistency of following up on unpaid invoices. Autonomous tone escalation, safety-guarded AI generation, and explicit human sign-offs on high-value accounts.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-btn bg-lake-blue text-white text-xs uppercase tracking-mono-wide font-medium hover:opacity-95 transition-all flex items-center gap-2 shadow-sm active:scale-98"
            >
              <span>Explore Receivables Ledger</span>
              <span>▸</span>
            </Link>

            <Link
              href="/decisions"
              className="px-8 py-3.5 rounded-btn border text-xs uppercase tracking-mono-wide font-medium transition-all hover:opacity-80"
              style={{ borderColor: 'var(--text-main)', color: 'var(--text-main)', backgroundColor: 'var(--bg-card)' }}
            >
              <span>Review Decision Queue</span>
            </Link>
          </div>
        </section>

        {/* Elevated Feature Card (Periwinkle Mist) */}
        <section className="monad-card-elevated p-8 sm:p-10 relative overflow-hidden space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill border text-xs uppercase tracking-mono-tight" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}>
                <span className="w-2 h-2 rounded-full bg-lake-blue"></span>
                <span>Graduated Escalation Ladder</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-editorial" style={{ color: 'var(--text-main)' }}>
                Calibrated tone progression across three tiers.
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                Friendly nudge at Day 1–7. Firm follow-up referencing prior contact at Day 8–21. Formal final notice held for owner review at Day 22+.
              </p>
            </div>

            <div className="lg:col-span-4 flex justify-end">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-btn text-xs uppercase tracking-mono-wide font-medium text-center"
                style={{ backgroundColor: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)' }}
              >
                <span>Inspect Live Operations ▸</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 3 Capability Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="monad-card p-8 space-y-4">
            <div className="p-3 rounded-full border w-fit" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}>
              <ReceiptText className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-editorial" style={{ color: 'var(--text-main)' }}>Tier 1 &amp; 2 Automation</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              Autonomous friendly reminders and firm follow-ups dispatched on scheduled intervals without human friction.
            </p>
          </div>

          <div className="monad-card p-8 space-y-4 border-l-4 border-l-coral">
            <div className="p-3 rounded-full border w-fit" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}>
              <ShieldAlert className="w-5 h-5 text-coral" />
            </div>
            <h3 className="text-2xl font-editorial" style={{ color: 'var(--text-main)' }}>Human Safeguard Gate</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              High-value balances (≥$10,000), disputes, and final tier notices are frozen in the decision queue until owner approval.
            </p>
          </div>

          <div className="monad-card p-8 space-y-4">
            <div className="p-3 rounded-full border w-fit" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}>
              <Sparkles className="w-5 h-5 text-lake-blue" />
            </div>
            <h3 className="text-2xl font-editorial" style={{ color: 'var(--text-main)' }}>LLM Copy Synthesis</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              Context-aware email copy generated via LiteLLM with strict word counts and zero aggressive legal vocabulary.
            </p>
          </div>

        </section>

      </main>

      {/* Colophon Footer */}
      <footer className="w-full border-t py-8 px-6 sm:px-10 mt-12 font-mono text-xs" style={{ borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}>
        <div className="max-w-[1432px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--text-main)' }}></span>
            <span>Chazer Autonomous Accounts Receivable</span>
            <span>·</span>
            <span>Monad Editorial Edition</span>
          </div>
          <div>
            <span>MIT License · Zero-Credit Free Tier Deployment</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
