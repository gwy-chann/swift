'use client';

import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertOctagon, X, PackageCheck } from 'lucide-react';
import type { ScanValidationCardProps } from '@/specs/113-pos-mobile-companion-validation-alerts/contracts/validation-card.contract';
import { SCANNER_FEEDBACK_CONSTANTS } from '@/lib/pos/scanner-feedback';

function formatPhilippinePeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ScanValidationCard({
  validation,
  onDismiss,
  autoDismissMs = SCANNER_FEEDBACK_CONSTANTS.DEFAULT_AUTO_DISMISS_MS,
  className = '',
}: Readonly<ScanValidationCardProps>) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!validation) return;

    // Reset any existing timer when a new scan validation arrives
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (autoDismissMs > 0 && onDismiss) {
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [validation, autoDismissMs, onDismiss]);

  if (!validation) {
    return null;
  }

  const isSuccess = validation.status === 'SUCCESS';

  return (
    <aside
      aria-label="Scan validation response"
      aria-live={isSuccess ? 'polite' : 'assertive'}
      role={isSuccess ? 'status' : 'alert'}
      onClick={() => onDismiss?.()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          onDismiss?.();
        }
      }}
      tabIndex={0}
      className={`fixed top-4 inset-x-4 max-w-md mx-auto z-50 cursor-pointer select-none transition-all duration-300 ease-out transform ${
        validation ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0 pointer-events-none'
      } ${className}`}
    >
      {isSuccess ? (
        /* Scenario 1: Successful Item Added Card */
        <div className="bg-bg-card border-2 border-success/40 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-shadow hover:shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success-light text-success flex items-center justify-center shrink-0 border border-success/30">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold tracking-wider text-text-muted uppercase">
                    {validation.sku}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-light text-success border border-success/30 flex items-center gap-1">
                    <PackageCheck className="w-3 h-3" />
                    Added to Cart
                  </span>
                </div>
                <h4 className="text-base font-bold text-text-primary leading-snug line-clamp-1">
                  {validation.productName ?? 'Product Item'}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss?.();
              }}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors"
              aria-label="Dismiss scan validation card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
            <div className="font-bold text-base text-text-primary">
              {validation.unitPrice !== undefined
                ? formatPhilippinePeso(validation.unitPrice)
                : '₱0.00'}
            </div>
            <div className="text-xs font-medium text-text-secondary bg-bg-muted px-2.5 py-1 rounded-md border border-border">
              {validation.remainingStock !== undefined
                ? `${validation.remainingStock} units remaining`
                : 'In Stock'}
            </div>
          </div>
        </div>
      ) : (
        /* Scenario 2: High-Contrast Rejection / Sold-Out Alert Banner */
        <div className="bg-danger text-white border-2 border-danger rounded-2xl p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30">
                <AlertOctagon className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] font-mono font-bold tracking-widest text-white/90 uppercase">
                  SKU: {validation.sku}
                </div>
                <h4 className="text-sm sm:text-base font-black tracking-wide leading-snug uppercase">
                  SOLD OUT / UNAVAILABLE — NOT ADDED TO CART
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss?.();
              }}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Dismiss scan alert banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {validation.reason && (
            <div className="mt-2.5 pt-2 border-t border-white/20 text-xs font-medium text-white/95">
              Reason: {validation.reason}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
