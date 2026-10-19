'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, X, Lock, AlertCircle, KeyRound } from 'lucide-react';
import { verifyAdminElevationAction } from '@/lib/staff/actions';

export interface ManagerOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverrideSuccess: () => void;
}

export function ManagerOverrideModal({
  isOpen,
  onClose,
  onOverrideSuccess,
}: Readonly<ManagerOverrideModalProps>) {
  const [credential, setCredential] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDismiss = useCallback(() => {
    setCredential('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDismiss]);

  if (!isOpen) return null;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const clean = credential.trim();
    if (!clean) {
      setError('Please enter the manager PIN or administrator password.');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await verifyAdminElevationAction(clean);
      if (!res.success) {
        setError(res.error || 'Invalid credentials. Manager override rejected.');
        setIsSubmitting(false);
        inputRef.current?.focus();
        return;
      }

      setIsSubmitting(false);
      setCredential('');
      setError(null);
      onOverrideSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization request failed.');
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }

  function handleQuickDemoPin(demoPin: string) {
    setCredential(demoPin);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-override-title"
      aria-describedby="manager-override-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
    >
      <div className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Modal Header */}
        <div className="p-4 border-b border-border bg-bg-card flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 id="manager-override-title" className="text-sm font-extrabold text-text-primary">
                Manager Elevation Override
              </h3>
              <p className="text-[11px] text-text-muted font-medium">
                Authorize One-Time Fast-Lane POS Checkout
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close manager elevation override modal"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p id="manager-override-description" className="text-xs text-text-secondary leading-relaxed">
            A Store Manager or Administrator must authenticate to override cashier role restrictions for this single sales transaction.
          </p>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-2.5 text-xs text-danger font-medium animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Input field */}
          <div className="space-y-1.5">
            <label
              htmlFor="manager-override-pin-input"
              className="block text-xs font-bold text-text-secondary uppercase tracking-wider"
            >
              Manager PIN or Master Password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="manager-override-pin-input"
                type="password"
                value={credential}
                onChange={(e) => {
                  setCredential(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                placeholder="Enter PIN (e.g. 8888) or password"
                className="w-full pl-9 pr-4 py-2.5 bg-bg-input border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors tracking-widest font-mono"
              />
              <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            </div>
          </div>

          {/* Quick Demo Assist */}
          <div className="pt-1">
            <span className="text-[10px] text-text-muted font-semibold block mb-1.5">
              Authorized Demo Credentials:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemoPin('8888')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-bg-card hover:bg-bg-hover border border-border text-text-secondary font-mono cursor-pointer transition-colors"
              >
                PIN: 8888 (Master)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoPin('admin123')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-bg-card hover:bg-bg-hover border border-border text-text-secondary font-mono cursor-pointer transition-colors"
              >
                Pass: admin123
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border bg-bg-surface hover:bg-bg-hover text-text-secondary text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !credential.trim()}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Checkout</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const PosManagerOverrideModal = ManagerOverrideModal;

