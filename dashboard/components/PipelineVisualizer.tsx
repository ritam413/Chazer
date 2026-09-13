'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Cpu, 
  Send, 
  FileCheck, 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Clock,
  CheckCircle2
} from 'lucide-react';

export interface PipelineStage {
  id: number;
  number: string;
  name: string;
  badge: string;
  metric: string;
  description: string;
  details: string;
  icon: React.ElementType;
  accentColor: string;
  highlights: string[];
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 1,
    number: '01',
    name: 'Receivables Ingested',
    badge: '8 Invoices · DB Seed',
    metric: '$96,990.00 · 8 Receivables',
    description: 'Raw invoice records ingested from Supabase Postgres with dynamic overdue arithmetic and client ledger mapping.',
    details: 'Status: Active Monitored Pool · Aging: 1–43d Overdue',
    icon: Database,
    accentColor: '#2b59d1', // Lake Blue
    highlights: ['Supabase Postgres Source', 'Dynamic Aging Math', '8 Demo Records'],
  },
  {
    id: 2,
    number: '02',
    name: 'Tone & Risk Matrix',
    badge: 'Rule + LLM Guard',
    metric: '4 Auto · 4 Escalated · 72h & $10k+',
    description: 'Multi-tier escalation classifier with 72h contact window guard and freeze gates for high-value & disputes.',
    details: 'T1 (Friendly): 2 · T2 (Firm): 2 · T3/High (Held): 4',
    icon: Cpu,
    accentColor: '#9fe3c0', // Mint
    highlights: ['72h Contact Window Guard', '$10k+ High-Value Freeze', 'LiteLLM Prompt Guard'],
  },
  {
    id: 3,
    number: '03',
    name: 'Dual-Lane Dispatch',
    badge: 'Resend + Queue',
    metric: '4 Sent ➔ 4 Review · Zero-Loss Guard',
    description: 'Auto-dispatches Tier 1 & 2 reminders via Resend API; routes Tier 3 & high-value invoices to owner Decision Queue.',
    details: 'Lane A: 4 Dispatched · Lane B: 4 Pending Owner Sign-off',
    icon: Send,
    accentColor: '#ff8a7a', // Coral
    highlights: ['Resend API Auto-Dispatch', 'Idempotency Key Injection', 'Owner Decision Queue'],
  },
  {
    id: 4,
    number: '04',
    name: 'Ledger & Audit Trail',
    badge: 'Immutable Telemetry',
    metric: '8 Cryptographic Logs · Instant Sync',
    description: 'Synchronous append-only telemetry logged in Postgres for every background decision, classification, draft, and dispatch.',
    details: 'Events: SWEEP_COMPLETED · Latency: ~140ms · 100% Verified',
    icon: FileCheck,
    accentColor: '#10b981', // Emerald
    highlights: ['Synchronous Audit Insertion', 'Real-Time Dashboard Sync', 'pg_cron Scheduled Daily'],
  },
];

export interface PipelineVisualizerProps {
  initialStage?: number;
  onStageChange?: (stage: number) => void;
  showControls?: boolean;
  className?: string;
}

export function PipelineVisualizer({
  initialStage = 1,
  onStageChange,
  showControls = true,
  className = '',
}: PipelineVisualizerProps) {
  const [activeStage, setActiveStage] = useState<number>(initialStage);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    setActiveStage(initialStage);
  }, [initialStage]);

  const handleSelectStage = useCallback((stageId: number) => {
    setActiveStage(stageId);
    if (onStageChange) {
      onStageChange(stageId);
    }
  }, [onStageChange]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    handleSelectStage(1);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setActiveStage(current => {
        const next = current >= 4 ? 1 : current + 1;
        if (onStageChange) {
          onStageChange(next);
        }
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, onStageChange]);

  const currentStageObj = PIPELINE_STAGES.find(s => s.id === activeStage) || PIPELINE_STAGES[0];

  return (
    <div 
      data-testid="pipeline-visualizer" 
      className={`monad-card p-6 sm:p-8 space-y-6 font-mono border rounded-card relative overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      role="region"
      aria-label="4-Stage Autonomous Collection Pipeline"
    >
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-mono-wide font-medium" style={{ color: 'var(--text-muted)' }}>
              Autonomous Orchestration Loop · 4-Stage State Machine
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-editorial tracking-serif-tight" style={{ color: 'var(--text-main)' }}>
            Collection Pipeline Visualizer
          </h3>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            <button
              data-testid="simulate-sweep-button"
              onClick={togglePlay}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-btn border text-xs uppercase tracking-mono-wide font-medium transition-all hover:opacity-85 shadow-sm"
              style={{
                backgroundColor: isPlaying ? 'var(--text-main)' : 'var(--chip-bg)',
                color: isPlaying ? 'var(--bg-page)' : 'var(--text-main)',
                borderColor: 'var(--border-card)',
              }}
              title={isPlaying ? 'Pause Simulation' : 'Simulate Sweep Cycle'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Loop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Simulate Sweep</span>
                </>
              )}
            </button>

            <button
              data-testid="reset-pipeline-button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-btn border text-xs uppercase tracking-mono-wide transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-card)',
                color: 'var(--text-muted)',
              }}
              title="Reset to Stage 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="sr-only sm:not-sr-only sm:text-[10px]">Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Connected 4-Stage Horizontal Grid */}
      <div className="relative">
        {/* Connector Line on Desktop */}
        <div 
          className="hidden lg:block absolute top-7 left-12 right-12 h-0.5 border-t-2 border-dashed pointer-events-none z-0"
          style={{ borderColor: 'var(--border-card)' }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {PIPELINE_STAGES.map((stage) => {
            const isActive = stage.id === activeStage;
            const isCompleted = stage.id < activeStage;
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                data-testid={`stage-card-${stage.id}`}
                data-active={isActive ? 'true' : 'false'}
                onClick={() => handleSelectStage(stage.id)}
                className={`group p-5 rounded-card border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 relative ${
                  isActive
                    ? 'ring-2 ring-emerald-500/40 shadow-md transform -translate-y-0.5'
                    : 'hover:border-stone-400 dark:hover:border-stone-600 opacity-80 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isActive 
                    ? 'rgba(16, 185, 129, 0.08)' 
                    : 'var(--bg-card)',
                  borderColor: isActive 
                    ? '#10b981' 
                    : 'var(--border-card)',
                }}
              >
                {/* Card Top: Number, Icon, Badge */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                          isActive 
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' 
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                            : 'border-border-card text-text-muted'
                        }`}
                        style={{
                          backgroundColor: isActive ? 'var(--text-main)' : undefined,
                          color: isActive ? 'var(--bg-page)' : undefined,
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <span>{stage.number}</span>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-mono-tight text-text-muted">
                        Stage {stage.id}/4
                      </span>
                    </div>

                    <div 
                      className="p-1.5 rounded-full border"
                      style={{ 
                        backgroundColor: 'var(--chip-bg)', 
                        borderColor: 'var(--border-card)',
                      }}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500 animate-bounce' : 'text-text-muted'}`} />
                    </div>
                  </div>

                  <div>
                    <h4 
                      className="text-base sm:text-lg font-editorial font-medium leading-snug"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {stage.name}
                    </h4>
                    <span 
                      className="inline-block mt-1 text-[10px] uppercase tracking-mono-tight px-2 py-0.5 rounded-pill border"
                      style={{ 
                        backgroundColor: 'var(--chip-bg)', 
                        borderColor: 'var(--border-card)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {stage.badge}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Metric & Footer Status */}
                <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-card)' }}>
                  <div className="text-xs font-mono font-medium truncate" style={{ color: 'var(--text-main)' }}>
                    {stage.metric}
                  </div>

                  <div className="flex items-center justify-between text-[10px] uppercase tracking-mono-tight" style={{ color: 'var(--text-muted)' }}>
                    <span>{isActive ? '● Active Step' : isCompleted ? '✓ Completed' : 'Pending'}</span>
                    <ArrowRight className={`w-3 h-3 transition-transform ${isActive ? 'translate-x-1 text-emerald-500' : 'opacity-40'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deep Stage Inspection Callout */}
      <div 
        data-testid="stage-detail-callout"
        className="p-5 sm:p-6 rounded-card border space-y-3 transition-all"
        style={{ 
          backgroundColor: 'var(--chip-bg)', 
          borderColor: 'var(--border-card)' 
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs uppercase tracking-mono-wide font-medium" style={{ color: 'var(--text-main)' }}>
              Stage {currentStageObj.id} Deep Inspection · {currentStageObj.name}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-mono-tight">
            {currentStageObj.highlights.map((tag, idx) => (
              <span 
                key={idx}
                className="px-2.5 py-0.5 rounded-pill border"
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderColor: 'var(--border-card)',
                  color: 'var(--text-sub)'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          {currentStageObj.description}
        </p>

        <div className="flex items-center gap-2 text-xs font-mono pt-1" style={{ color: 'var(--text-muted)' }}>
          <span className="text-emerald-500 font-medium">Telemetry:</span>
          <span>{currentStageObj.details}</span>
        </div>
      </div>
    </div>
  );
}
