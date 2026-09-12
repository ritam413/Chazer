'use client';

import React, { useState } from 'react';
import { Mail, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { EmailDraftPreviewProps } from '../lib/types';

export function EmailDraftPreview({
  subject,
  body,
  tier,
  llmConfidence,
}: EmailDraftPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const confidencePercentage = llmConfidence
    ? Math.round(llmConfidence <= 1 ? llmConfidence * 100 : llmConfidence)
    : 95;

  const isLongBody = body.length > 280;

  return (
    <div
      data-testid="email-draft-preview"
      className="rounded-card border overflow-hidden text-xs font-mono transition-colors"
      style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-card)' }}
    >
      {/* Email Header Bar */}
      <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-sub)' }}>
          <Mail className="w-4 h-4 text-lake-blue" />
          <span>From: <strong style={{ color: 'var(--text-main)' }}>reminders@chazer.dev</strong> (Autonomous Sweep)</span>
        </div>

        {/* AI Confidence Badge */}
        <div
          data-testid="ai-confidence-badge"
          className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-pill text-[11px] uppercase tracking-mono-tight font-medium border self-start sm:self-auto"
          style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
        >
          <Sparkles className="w-3.5 h-3.5 text-lake-blue" />
          <span>AI Confidence {confidencePercentage}%</span>
        </div>
      </div>

      {/* Subject Line */}
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-card)' }}>
        <div className="text-[10px] uppercase tracking-mono-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
          Subject
        </div>
        <div className="text-sm font-medium leading-snug" style={{ color: 'var(--text-main)' }} data-testid="draft-subject">
          {subject}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 relative">
        <div
          data-testid="draft-body"
          className={`whitespace-pre-wrap text-xs leading-relaxed transition-all duration-200 ${
            !isExpanded && isLongBody ? 'line-clamp-4' : ''
          }`}
          style={{ color: 'var(--text-sub)' }}
        >
          {body}
        </div>

        {isLongBody && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-xs uppercase tracking-mono-wide font-medium flex items-center gap-1 transition-colors text-lake-blue"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Show full email
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
