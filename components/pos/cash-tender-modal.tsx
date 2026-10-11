'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Banknote, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  calculateCashTender,
  generateQuickDenominations,
  formatPeso
} from '@/lib/pos/cash-tender';

export interface CashTenderModalProps {
  isOpen: boolean;
  totalDue: number;
  isProcessing?: boolean;
  onClose: () => void;
  onConfirmPayment: (cashTendered: number, changeDue: number) => Promise<void> | void;
}

export function CashTenderModal({
  isOpen,
  totalDue,
  isProcessing = false,
  onClose,
  onConfirmPayment
}: Readonly<CashTenderModalProps>) {
  const [tenderInput, setTenderInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize tender input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setTenderInput('');
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, totalDue]);

  const parsedTendered = tenderInput.trim() === '' ? 0 : parseFloat(tenderInput) || 0;
  const tenderResult = calculateCashTender(totalDue, parsedTendered);
  const denominations = generateQuickDenominations(totalDue);

  const handleSelectDenomination = useCallback((amount: number) => {
    setTenderInput(amount.toString());
    inputRef.current?.focus();
  }, []);

  const handleClear = useCallback(() => {
    setTenderInput('');
    inputRef.current?.focus();
  }, []);

  const handleConfirm = useCallback(() => {
    if (!tenderResult.isValid || isProcessing) return;
    onConfirmPayment(tenderResult.cashTendered, tenderResult.changeDue);
  }, [tenderResult, isProcessing, onConfirmPayment]);

  // Keyboard ergonomics: F12 or Enter to complete payment, Escape to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'F12' || e.key === 'Enter') {
        e.preventDefault();
        if (tenderResult.isValid && !isProcessing) {
          handleConfirm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, tenderResult.isValid, isProcessing, handleConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cash-tender-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-light text-primary border border-primary/20">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cash-tender-modal-title" className="text-sm font-bold text-text-primary">
                Cash Tender & Payment
              </h3>
              <p className="text-xs text-text-muted">Fast-lane change calculator & validation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Total Due Banner */}
          <div className="p-3.5 rounded-lg bg-bg-base border border-border flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              TOTAL DUE
            </span>
            <span
              data-testid="payment-modal-total-due"
              className="text-2xl font-black font-mono text-text-primary"
            >
              {formatPeso(totalDue)}
            </span>
          </div>

          {/* Quick Denomination Buttons (Scenario 1) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Quick Currency Denominations</span>
              <span className="text-[10px] text-text-muted">PHP Bills</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {denominations.map((denom) => {
                const isSelected = parsedTendered === denom.amount;
                return (
                  <button
                    key={`${denom.label}-${denom.amount}`}
                    type="button"
                    onClick={() => handleSelectDenomination(denom.amount)}
                    data-testid={`quick-denom-${denom.amount}`}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer text-center select-none ${
                      isSelected
                        ? 'bg-primary text-text-light border-primary shadow-xs'
                        : 'bg-bg-base hover:bg-bg-hover text-text-primary border-border'
                    }`}
                  >
                    {denom.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tendered Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <label htmlFor="cash-tendered-input">Cash Tendered (₱)</label>
              {tenderInput !== '' && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-text-muted hover:text-danger flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold font-mono text-text-muted select-none">
                ₱
              </span>
              <input
                ref={inputRef}
                id="cash-tendered-input"
                data-testid="cash-tendered-input"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={tenderInput}
                onChange={(e) => setTenderInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-bg-input border border-border focus:border-primary focus:outline-hidden text-xl font-bold font-mono text-text-primary transition-colors"
              />
            </div>
          </div>

          {/* Real-Time Change Due / Shortage Banner (Scenarios 2 & 3) */}
          <div className="transition-all">
            {tenderResult.isValid ? (
              <div
                data-testid="change-due-banner"
                className="p-3.5 rounded-lg bg-success-light border border-success/30 flex items-center justify-between animate-in fade-in duration-100"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-success uppercase tracking-wider">
                      CHANGE DUE
                    </div>
                    <div className="text-[11px] text-text-muted">
                      {tenderResult.isExact
                        ? 'Exact tender - zero change'
                        : 'Return to customer'}
                    </div>
                  </div>
                </div>
                <div className="text-xl font-black font-mono text-success">
                  {formatPeso(tenderResult.changeDue)}
                </div>
              </div>
            ) : (
              <div
                data-testid="shortage-warning-banner"
                className="p-3.5 rounded-lg bg-danger-light border border-danger/30 flex items-center justify-between animate-in fade-in duration-100"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-danger uppercase tracking-wider">
                      SHORTAGE WARNING
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Insufficient funds received
                    </div>
                  </div>
                </div>
                <div className="text-sm font-extrabold font-mono text-danger">
                  Shortage: {formatPeso(tenderResult.shortage)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border bg-bg-surface flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-lg text-xs font-bold bg-bg-muted hover:bg-bg-hover text-text-secondary transition-colors cursor-pointer"
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            data-testid="complete-payment-button"
            disabled={!tenderResult.isValid || isProcessing}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all ${
              !tenderResult.isValid || isProcessing
                ? 'bg-bg-muted text-text-muted border border-border-subtle cursor-not-allowed opacity-60'
                : 'bg-primary hover:bg-primary-hover text-text-light cursor-pointer shadow-md'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'Processing...' : 'Complete Payment (F12)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
