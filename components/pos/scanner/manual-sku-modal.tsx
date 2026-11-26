'use client';

import React, { useState } from 'react';
import type { ManualSkuModalProps } from '@/specs/110-pos-mobile-companion-scanner/contracts/barcode-scanner.contract';

export function ManualSkuModal({
  isOpen,
  onClose,
  onSubmit
}: Readonly<ManualSkuModalProps>) {
  const [skuInput, setSkuInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setSkuInput('');
    setValidationError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = skuInput.trim();
    if (!trimmed) {
      setValidationError('Please enter a valid SKU or barcode number');
      return;
    }
    onSubmit(trimmed);
    setSkuInput('');
    setValidationError(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-sku-title"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
      data-testid="manual-sku-modal"
    >
      {/* Backdrop tap to dismiss */}
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Slide-up Bottom Sheet Container */}
      <div className="relative w-full sm:max-w-md bg-bg-surface border-t sm:border border-border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 text-text-primary">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">⌨️</span>
            <h2 id="manual-sku-title" className="text-lg font-bold">
              Type SKU Manually
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
            aria-label="Close manual SKU entry"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-text-muted">
          For torn, smudged, or unreadable barcode labels. Enter the alphanumeric part SKU or barcode digits.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sku-input" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Part SKU / Barcode Code
            </label>
            <input
              id="sku-input"
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              value={skuInput}
              onChange={(e) => {
                setSkuInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. YAM-NMAX-BL01 or 4901234567890"
              className="w-full px-3.5 py-3 rounded-xl bg-bg-base border border-border text-text-primary placeholder:text-text-muted/60 text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              data-testid="manual-sku-input"
            />
            {validationError && (
              <span className="text-xs text-danger font-medium mt-0.5">
                {validationError}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-border bg-bg-base text-text-muted hover:text-text-primary font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-colors shadow-xs active:scale-98"
              data-testid="manual-sku-submit-btn"
            >
              Submit SKU
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
