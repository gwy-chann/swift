'use client';

import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Wrench, Tag } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import type { CartItem, Product } from '@/lib/types';

export interface HybridCartPaneProps {
  ticketNumber?: string;
  catalogProducts?: Product[];
  onRequireOverride?: (product: Product) => void;
  onCompleteSale?: () => void;
  isProcessing?: boolean;
}

export function HybridCartPane({
  ticketNumber = 'TX-1043',
  catalogProducts = [],
  onRequireOverride,
  onCompleteSale,
  isProcessing = false
}: HybridCartPaneProps) {
  const {
    items,
    pricingMode,
    discountRate,
    totals,
    setPricingMode,
    setDiscountRate,
    updateQuantity,
    removeItem
  } = useCartStore();

  const handleStepQuantity = (item: CartItem, delta: number) => {
    const nextQty = item.qty + delta;
    if (nextQty <= 0) {
      removeItem(item.id);
      return;
    }

    if (item.type === 'part' && delta > 0 && !item.isOverridden) {
      const product = catalogProducts.find((p) => p.sku === item.sku);
      const availableStock = product?.stock ?? item.stock ?? 999;
      if (nextQty > availableStock) {
        if (onRequireOverride && product) {
          onRequireOverride(product);
          return;
        }
      }
    }

    updateQuantity(item.id, nextQty);
  };

  return (
    <div className="w-full lg:w-96 flex flex-col bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden shrink-0">
      {/* Ticket Header */}
      <div className="p-4 border-b border-border bg-bg-surface/50 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-secondary" />
            <span>Current Ticket</span>
          </div>
          <div className="text-[11px] text-text-muted font-mono">Ticket #{ticketNumber}</div>
        </div>

        {/* Retail vs Wholesale Pricing Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-bg-base border border-border text-xs font-bold">
          <button
            type="button"
            data-testid="pricing-tab-retail"
            onClick={() => setPricingMode('retail')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              pricingMode === 'retail'
                ? 'bg-primary text-text-light shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Retail
          </button>
          <button
            type="button"
            data-testid="pricing-tab-wholesale"
            onClick={() => setPricingMode('wholesale')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              pricingMode === 'wholesale'
                ? 'bg-primary text-text-light shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Wholesale
          </button>
        </div>
      </div>

      {/* Cart Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted">
            <ShoppingCart className="w-8 h-8 mb-2 stroke-1" />
            <p className="text-xs font-semibold">Active ticket is empty</p>
            <p className="text-[11px] mt-0.5">Click parts or workshop services from the catalog to begin</p>
          </div>
        ) : (
          items.map((item) => {
            const isService = item.type === 'service';
            const itemTotal = item.price * item.qty;

            return (
              <div
                key={item.id}
                className="p-3 bg-bg-base border border-border rounded-lg space-y-2 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{item.name}</p>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {isService ? (
                        <>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary-light text-primary border border-primary/20 flex items-center gap-1">
                            <Wrench className="w-2.5 h-2.5" />
                            <span>Workshop Service</span>
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">{item.code}</span>
                          {item.bay && (
                            <span className="text-[10px] text-text-muted font-medium bg-bg-muted px-1.5 py-0.5 rounded">
                              {item.bay}
                            </span>
                          )}
                          {item.duration && (
                            <span className="text-[10px] text-text-muted font-medium">
                              ({item.duration})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] text-text-muted font-mono">{item.sku}</span>
                          {item.location && (
                            <span className="text-[10px] text-text-secondary bg-bg-muted px-1.5 py-0.5 rounded font-medium">
                              {item.location}
                            </span>
                          )}
                          {item.isOverridden && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger text-text-light">
                              Backorder (Overridden)
                            </span>
                          )}
                          {!item.isOverridden &&
                            typeof item.stock === 'number' &&
                            typeof item.minThreshold === 'number' &&
                            item.stock <= item.minThreshold &&
                            item.stock > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger-light text-danger border border-danger/30">
                                Low Stock ({item.stock} left)
                              </span>
                            )}
                        </>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-bold font-mono text-text-primary shrink-0">
                    ₱{itemTotal.toFixed(2)}
                  </span>
                </div>

                {/* Quantity Stepper & Removal */}
                <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(item, -1)}
                      aria-label="Decrease quantity"
                      className="p-1 rounded bg-bg-muted hover:bg-bg-hover text-text-secondary cursor-pointer transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-xs px-2 select-none">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(item, 1)}
                      aria-label="Increase quantity"
                      className="p-1 rounded bg-bg-muted hover:bg-bg-hover text-text-secondary cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted">
                      ₱{item.price.toFixed(2)} / ea
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove item from ticket"
                      className="p-1 text-text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary & Checkout Footer */}
      <div className="p-4 border-t border-border bg-bg-surface/80 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Subtotal</span>
          <span className="font-mono font-bold text-text-primary">₱{totals.subtotal.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-danger">
          <span>Discount ({Math.round(discountRate * 100)}%)</span>
          <span className="font-mono font-bold">-₱{totals.discountAmount.toFixed(2)}</span>
        </div>

        {/* Discount Rate Selector */}
        <div className="flex items-center gap-1.5 pt-1">
          {[
            { label: '0% Standard', rate: 0 },
            { label: '5% VIP', rate: 0.05 },
            { label: '20% SC/PWD', rate: 0.20 }
          ].map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => setDiscountRate(d.rate)}
              className={`flex-1 py-1 px-2 rounded text-[10px] font-bold text-center border transition-colors cursor-pointer ${
                discountRate === d.rate
                  ? 'bg-primary text-text-light border-primary shadow-xs'
                  : 'bg-bg-base hover:bg-bg-hover text-text-muted border-border'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Total Due */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">
            TOTAL DUE
          </span>
          <span className="text-lg font-black font-mono text-success">
            ₱{totals.total.toFixed(2)}
          </span>
        </div>

        {/* Visual Active Wholesale Tier Warning Indicator (SIAA-19) */}
        {pricingMode === 'wholesale' && (
          <div
            data-testid="wholesale-tier-badge"
            className="p-2.5 rounded-lg bg-accent/15 border border-accent/40 text-accent flex items-center justify-between gap-2 shadow-2xs transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
              <div>
                <div className="text-[11px] font-black tracking-wider uppercase flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-accent" />
                  <span>WHOLESALE TIER ACTIVE</span>
                </div>
                <div className="text-[10px] text-text-muted font-medium">
                  Trade prices applied &bull; Labor invariant
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-accent text-text-light">
              Wholesale
            </span>
          </div>
        )}

        {/* Complete Sale Action */}
        <button
          type="button"
          disabled={items.length === 0 || isProcessing}
          onClick={onCompleteSale}
          className={`w-full py-3 px-4 rounded-lg text-xs font-extrabold shadow-md uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
            items.length === 0 || isProcessing
              ? 'bg-bg-muted text-text-muted border border-border-subtle cursor-not-allowed'
              : 'bg-primary hover:bg-primary-hover text-text-light cursor-pointer'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isProcessing ? 'PROCESSING...' : 'COMPLETE SALE (F12)'}</span>
        </button>
      </div>
    </div>
  );
}
