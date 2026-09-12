'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Check, Send } from 'lucide-react';
import { EditDraftModalProps } from '../lib/types';

export function EditDraftModal({
  isOpen,
  onClose,
  initialSubject,
  initialBody,
  onSave,
  invoiceId,
}: EditDraftModalProps & { invoiceId?: string }) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setBody(initialBody);
      setValidationError(null);
    }
  }, [isOpen, initialSubject, initialBody]);

  if (!isOpen) return null;

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const isWordCountOver = wordCount > 200;

  const handleSave = () => {
    if (!subject.trim()) {
      setValidationError('Subject line cannot be empty.');
      return;
    }

    if (!body.trim()) {
      setValidationError('Email body cannot be empty.');
      return;
    }

    if (invoiceId && !body.includes(invoiceId)) {
      setValidationError(`Safety Rule: The email body must contain the Invoice ID (${invoiceId}).`);
      return;
    }

    onSave(subject, body);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      data-testid="edit-draft-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
    >
      <div className="monad-card w-full max-w-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] p-0" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--border-card)', backgroundColor: 'var(--chip-bg)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full border text-xs" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}>
              <Sparkles className="w-4 h-4 text-lake-blue" />
            </div>
            <div>
              <h3 id="edit-modal-title" className="text-xl font-editorial" style={{ color: 'var(--text-main)' }}>
                Edit Email Draft {invoiceId && <span className="font-mono text-sm opacity-70">({invoiceId})</span>}
              </h3>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Modify subject or body prior to final dispatch.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-full border transition-colors hover:opacity-100 opacity-60"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 font-mono">
          {/* Validation Error Alert */}
          {validationError && (
            <div
              data-testid="edit-modal-error"
              className="p-3.5 rounded-2xl bg-coral/20 border border-coral text-xs text-off-black flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Subject Field */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-mono-wide font-medium" style={{ color: 'var(--text-muted)' }}>
              Subject Line
            </label>
            <input
              type="text"
              data-testid="edit-draft-subject-input"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. Final Notice: Invoice #INV-005 Overdue"
              className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
            />
          </div>

          {/* Body Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-mono-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                Email Body
              </label>
              <span
                data-testid="edit-draft-word-count"
                className={`text-xs font-mono font-medium ${
                  isWordCountOver ? 'text-coral' : 'opacity-60'
                }`}
                style={!isWordCountOver ? { color: 'var(--text-muted)' } : {}}
              >
                {wordCount} / 200 words
              </span>
            </div>
            <textarea
              rows={9}
              data-testid="edit-draft-body-textarea"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Write your email content here..."
              className="w-full p-4 rounded-xl border text-xs leading-relaxed focus:outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
            />
          </div>

          {/* Guidelines info */}
          <div className="p-3.5 rounded-2xl border text-[11px] space-y-1" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-sub)' }}>
            <p className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Must explicitly include invoice ID {invoiceId ? `(${invoiceId})` : ''} and settlement total.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Maintain professional tone. Threatening legal actions is automatically blocked.</span>
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t font-mono" style={{ borderColor: 'var(--border-card)', backgroundColor: 'var(--chip-bg)' }}>
          <button
            type="button"
            onClick={onClose}
            data-testid="edit-draft-cancel-button"
            className="px-5 py-2.5 rounded-btn border text-xs uppercase tracking-mono-wide font-medium transition-colors"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-sub)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            data-testid="edit-draft-save-button"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-btn bg-lake-blue hover:opacity-90 text-white text-xs uppercase tracking-mono-wide font-medium transition-all active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5" />
            Save &amp; Approve
          </button>
        </div>
      </div>
    </div>
  );
}
