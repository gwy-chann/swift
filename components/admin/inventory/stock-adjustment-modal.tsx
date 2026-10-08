'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  X,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  Package,
  ArrowRight
} from 'lucide-react';
import type { Product } from '@/lib/types/product';
import {
  AdjustmentType,
  calculateStockAdjustmentDelta
} from '@/lib/inventory/stock-adjustment';

export interface StockAdjustmentModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (params: {
    sku: string;
    type: AdjustmentType;
    delta: number;
    reason: string;
  }) => void;
}

export function StockAdjustmentModal({
  isOpen,
  product,
  onClose,
  onSubmit
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('Restock Inbound');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [auditMode, setAuditMode] = useState<'add' | 'deduct'>('deduct');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAdjustmentType('Restock Inbound');
      setQuantityInput('1');
      setReasonInput('');
      setAuditMode('deduct');
      // Imperative focus to avoid jsx autoFocus warnings
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, product]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) {
    return null;
  }

  const parsedQty = parseInt(quantityInput, 10);
  const validQty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 0;

  const currentMode =
    adjustmentType === 'Audit Adjustment'
      ? auditMode
      : adjustmentType === 'Restock Inbound'
        ? 'add'
        : 'deduct';

  const { delta, resultingStock, formattedChange } = calculateStockAdjustmentDelta({
    currentStock: product.stock,
    type: adjustmentType,
    quantity: validQty,
    mode: currentMode
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validQty <= 0) return;

    onSubmit({
      sku: product.sku,
      type: adjustmentType,
      delta,
      reason: reasonInput.trim() || `${adjustmentType} manual stock adjustment`
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-light text-primary border border-primary/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 id="stock-adjustment-title" className="text-base font-bold text-text-primary">
                Stock Adjustment
              </h3>
              <p className="text-xs text-text-muted">
                Audit and reconcile inventory counts with reason tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Information Card */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-lg bg-bg-surface border border-border-subtle flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-bg-muted border border-border-subtle text-text-primary select-all">
                  {product.sku}
                </span>
                <span className="text-xs font-semibold text-text-secondary">
                  {product.brand}
                </span>
              </div>
              <h4 className="text-sm font-bold text-text-primary leading-tight">
                {product.name}
              </h4>
              <p className="text-xs text-text-muted">
                Fitment: {product.model}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold text-text-muted uppercase block">
                Current Stock
              </span>
              <span className="text-lg font-black text-text-primary">
                {product.stock} Units
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Adjustment Type Selector */}
            <div>
              <label
                htmlFor="adjustment-type-select"
                className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5"
              >
                Adjustment Type
              </label>
              <select
                id="adjustment-type-select"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-bg-input border border-border text-sm font-semibold text-text-primary focus:border-primary focus:outline-hidden transition-colors cursor-pointer"
              >
                <option value="Restock Inbound">Restock Inbound (+ Stock)</option>
                <option value="Damaged Goods">Damaged Goods (- Write-off)</option>
                <option value="Audit Adjustment">Audit Adjustment (Discrepancy Correction)</option>
                <option value="Shrinkage">Shrinkage / Missing Item (- Loss)</option>
              </select>
            </div>

            {/* Audit Adjustment Mode Switcher (if Audit Adjustment is chosen) */}
            {adjustmentType === 'Audit Adjustment' && (
              <div className="p-3 rounded-lg bg-bg-muted/50 border border-border-subtle space-y-2">
                <span className="text-xs font-bold text-text-secondary block">
                  Discrepancy Direction:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuditMode('add')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      auditMode === 'add'
                        ? 'bg-success text-text-light border-success'
                        : 'bg-bg-surface text-text-secondary border-border-subtle hover:bg-bg-hover'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Count is Higher (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditMode('deduct')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      auditMode === 'deduct'
                        ? 'bg-danger text-text-light border-danger'
                        : 'bg-bg-surface text-text-secondary border-border-subtle hover:bg-bg-hover'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    <span>Count is Lower (-)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Adjustment Quantity Input */}
            <div>
              <label
                htmlFor="adjustment-quantity-input"
                className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5"
              >
                Quantity to Adjust
              </label>
              <input
                id="adjustment-quantity-input"
                ref={inputRef}
                type="number"
                min="1"
                step="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder="Enter units..."
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-bg-input border border-border text-base font-bold font-mono text-text-primary focus:border-primary focus:outline-hidden transition-colors"
              />
            </div>

            {/* Reason Notes */}
            <div>
              <label
                htmlFor="adjustment-reason-input"
                className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5"
              >
                Reason / Audit Note <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              <input
                id="adjustment-reason-input"
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. PO-4091 Supplier Delivery Received / Water Damage"
                className="w-full px-3.5 py-2.5 rounded-lg bg-bg-input border border-border text-xs text-text-primary focus:border-primary focus:outline-hidden transition-colors"
              />
            </div>

            {/* Live Resulting Stock Calculation Preview */}
            <div className="p-3.5 rounded-lg bg-bg-muted/70 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-text-secondary shrink-0" />
                <span className="font-semibold text-text-secondary">Projected Stock:</span>
                <span className="font-bold text-text-primary">{product.stock}</span>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                <span className="font-black text-primary text-sm">{resultingStock} Units</span>
              </div>

              <span
                className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                  delta >= 0
                    ? 'bg-success-light text-success border border-success/30'
                    : 'bg-danger-light text-danger border border-danger/30'
                }`}
              >
                {formattedChange}
              </span>
            </div>

            {/* Warning if deducting below zero */}
            {product.stock + delta < 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent-light text-accent border border-accent/30 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Deduction exceeds on-hand stock. Final count will be floored at 0 units.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold rounded-lg bg-bg-muted hover:bg-bg-hover text-text-secondary border border-border-subtle transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={validQty <= 0}
                className="px-5 py-2.5 text-xs font-bold rounded-lg bg-primary hover:bg-primary-hover text-text-light transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Adjustment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
