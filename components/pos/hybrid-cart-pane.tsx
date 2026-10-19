'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Wrench, Tag, Clock } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { usePunchStore, type ShiftStateStatus } from '@/lib/store/punch-store';
import { DISCOUNT_TIERS } from '@/lib/pos/discount-matrix';
import type { CartItem, Product } from '@/lib/types';

export interface HybridCartPaneProps {
  ticketNumber?: string;
  catalogProducts?: Product[];
  onRequireOverride?: (product: Product) => void;
  onCompleteSale?: () => void;
  isProcessing?: boolean;
  isShiftActive?: boolean;
  shiftStatus?: ShiftStateStatus;
}

function isDiscountTierActive(
  tierId: string,
  tierRate: number,
  discountRate: number,
  discountType: string
): boolean {
  if (tierId === 'none') {
    return discountRate === 0 || discountType === 'none';
  }
  return discountType === tierId || Math.abs(discountRate - tierRate) < 0.001;
}

function getShiftWarningBannerContent(status: ShiftStateStatus) {
  if (status === 'break') {
    return {
      title: 'SHIFT ON BREAK',
      subtitle: 'Resume shift at punch clock to process sales'
    };
  }
  if (status === 'completed') {
    return {
      title: 'SHIFT COMPLETED',
      subtitle: 'Time-in required before completing sales'
    };
  }
  return {
    title: 'NOT TIMED IN / SHIFT INACTIVE',
    subtitle: 'Time-in required before completing sales'
  };
}

function getCheckoutButtonTitle(isReady: boolean, itemCount: number): string {
  if (!isReady) {
    return 'Active shift required: Time in at punch clock before processing customer orders';
  }
  if (itemCount === 0) {
    return 'Active ticket is empty';
  }
  return 'Complete sale (F12)';
}

function getCheckoutButtonClass(isDisabled: boolean, isReady: boolean): string {
  if (isDisabled) {
    return 'bg-bg-muted text-text-muted border border-border-subtle cursor-not-allowed';
  }
  if (!isReady) {
    return 'bg-warning/20 text-warning border border-warning/40 hover:bg-warning/30 cursor-pointer';
  }
  return 'bg-primary hover:bg-primary-hover text-text-light cursor-pointer';
}

function getCheckoutButtonLabel(isProcessing: boolean, isReady: boolean): string {
  if (isProcessing) return 'PROCESSING...';
  if (!isReady) return 'TIME-IN REQUIRED (F12)';
  return 'COMPLETE SALE (F12)';
}

export function HybridCartPane({
  ticketNumber = 'TX-1043',
  catalogProducts = [],
  onRequireOverride,
  onCompleteSale,
  isProcessing = false,
  isShiftActive: isShiftActiveProp,
  shiftStatus: shiftStatusProp
}: Readonly<HybridCartPaneProps>) {
  const punchState = usePunchStore();
  const shiftActive = isShiftActiveProp ?? punchState.isShiftActive;
  const activeShiftStatus = shiftStatusProp ?? punchState.shiftStatus;
  const isShiftReady = shiftActive && activeShiftStatus === 'on_shift';
  const shiftBanner = getShiftWarningBannerContent(activeShiftStatus);

  const {
    items,
    pricingMode,
    discountRate,
    discountType,
    totals,
    setPricingMode,
    setDiscountTier,
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
      if (nextQty > availableStock && onRequireOverride && product) {
        onRequireOverride(product);
        return;
      }
    }

    updateQuantity(item.id, nextQty);
  };

  const isCheckoutDisabled = items.length === 0 || isProcessing;
  const checkoutTitle = getCheckoutButtonTitle(isShiftReady, items.length);
  const checkoutClass = getCheckoutButtonClass(isCheckoutDisabled, isShiftReady);
  const checkoutLabel = getCheckoutButtonLabel(isProcessing, isShiftReady);

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

        {/* Standardized Customer Discount Matrix Chips (SIAA-20) */}
        <div className="flex items-center gap-1.5 pt-1">
          {DISCOUNT_TIERS.map((tier) => {
            const isActive = isDiscountTierActive(tier.id, tier.rate, discountRate, discountType);

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setDiscountTier(tier.id)}
                title={tier.description}
                aria-pressed={isActive}
                className={`flex-1 py-1 px-1 rounded text-[10px] font-bold text-center border transition-all cursor-pointer select-none ${
                  isActive
                    ? 'border-accent text-accent bg-accent-light shadow-2xs'
                    : 'bg-bg-base hover:bg-bg-hover text-text-secondary border-border'
                }`}
              >
                {tier.label}
              </button>
            );
          })}
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

        {/* Visual Inactive Shift Warning Indicator (SIAA-74) */}
        {!isShiftReady && (
          <div
            data-testid="shift-inactive-warning-banner"
            className="p-2.5 rounded-lg bg-warning/15 border border-warning/40 text-warning flex items-center justify-between gap-2 shadow-2xs transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-warning animate-pulse" />
              <div>
                <div className="text-[11px] font-black tracking-wider uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-warning" />
                  <span>{shiftBanner.title}</span>
                </div>
                <div className="text-[10px] text-text-muted font-medium">
                  {shiftBanner.subtitle}
                </div>
              </div>
            </div>
            <Link
              href="/staff/clock"
              className="px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-wide bg-warning text-text-light hover:bg-warning/90 transition-colors shadow-2xs"
            >
              Punch Clock
            </Link>
          </div>
        )}

        {/* Complete Sale Action */}
        <button
          type="button"
          disabled={isCheckoutDisabled}
          onClick={onCompleteSale}
          title={checkoutTitle}
          className={`w-full py-3 px-4 rounded-lg text-xs font-extrabold shadow-md uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${checkoutClass}`}
        >
          {!isShiftReady ? (
            <Clock className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{checkoutLabel}</span>
        </button>
      </div>
    </div>
  );
}
