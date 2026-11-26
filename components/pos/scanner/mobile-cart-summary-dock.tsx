'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import type { MobileCartSummaryDockProps } from '@/specs/113-pos-mobile-companion-validation-alerts/contracts/validation-card.contract';

function formatPhilippinePeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function MobileCartSummaryDock({
  cart,
  onClick,
  className = '',
}: Readonly<MobileCartSummaryDockProps>) {
  const itemCountLabel = cart.itemCount === 1 ? '1 item' : `${cart.itemCount} items`;

  return (
    <footer
      aria-label="Running cart summary dock"
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      className={`fixed bottom-0 inset-x-0 z-30 bg-bg-surface/95 backdrop-blur-md border-t border-border shadow-lg transition-transform ${
        onClick ? 'cursor-pointer hover:bg-bg-hover active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center border border-primary-border">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-text-primary">
            Cart:{' '}
            <span className="font-bold text-primary tracking-wide">
              {itemCountLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">Subtotal:</span>
          <span className="text-sm sm:text-base font-bold font-mono text-text-primary tracking-tight">
            {formatPhilippinePeso(cart.subtotal)}
          </span>
        </div>
      </div>
    </footer>
  );
}
