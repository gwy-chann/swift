'use client';

import React, { useState } from 'react';
import { ShieldAlert, X, Check, Lock } from 'lucide-react';
import { Product } from '@/lib/types/product';

interface ManagerOverrideModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onAuthorize: (product: Product, overrideReason: string) => void;
}

export function ManagerOverrideModal({
  isOpen,
  product,
  onClose,
  onAuthorize
}: Readonly<ManagerOverrideModalProps>) {
  const [managerPin, setManagerPin] = useState('');
  const [reason, setReason] = useState('Customer urgent request - supplier stock arriving');
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Verify PIN (default supervisor pin 1234 or any non-empty input for development)
    if (managerPin.trim().length < 4) {
      setError('Please enter a valid 4-digit Manager PIN (Demo: 1234)');
      return;
    }

    onAuthorize(product, reason);
    setManagerPin('');
    setError('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="w-full max-w-md bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Modal Header */}
        <div className="p-4 border-b border-border bg-danger-light flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-danger text-text-light">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="override-modal-title" className="text-sm font-bold text-text-primary">
                Manager Override Required
              </h3>
              <p className="text-xs text-danger font-semibold">
                Zero Stock Out-of-Stock Protection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close override modal"
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-lg bg-bg-card border border-border text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-mono text-text-muted">{product.sku}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger text-text-light">
                0 Units in Stock
              </span>
            </div>
            <p className="font-bold text-text-primary text-sm">{product.name}</p>
            <p className="text-text-secondary text-[11px]">
              This motorcycle part is physically depleted on the shop floor. Selling it will create a negative physical inventory deficit.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="manager-pin-input"
              className="text-xs font-bold text-text-secondary flex items-center gap-1"
            >
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              <span>Supervisor / Manager Authorization PIN</span>
            </label>
            <input
              id="manager-pin-input"
              type="password"
              maxLength={6}
              value={managerPin}
              onChange={(e) => {
                setManagerPin(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter 4-digit PIN (Demo: 1234)"
              autoFocus
              className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary rounded-md border border-border focus:border-border-focus focus:ring-1 focus:ring-border-focus outline-hidden transition-colors font-mono tracking-widest text-center"
            />
            {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="override-reason-select"
              className="text-xs font-bold text-text-secondary"
            >
              Override Justification
            </label>
            <select
              id="override-reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg-input text-text-primary rounded-md border border-border focus:border-border-focus outline-hidden transition-colors cursor-pointer"
            >
              <option value="Customer urgent request - supplier stock arriving">
                Customer urgent request - supplier stock arriving
              </option>
              <option value="Unrecorded physical shelf restock on hand">
                Unrecorded physical shelf restock on hand
              </option>
              <option value="Store manager special authorization">
                Store manager special authorization
              </option>
            </select>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-bg-muted hover:bg-bg-hover text-text-secondary border border-border-subtle transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-md bg-danger hover:bg-danger/90 text-text-light shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Authorize Sale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
