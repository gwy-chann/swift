'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SearchX, Search, RotateCcw, AlertCircle } from 'lucide-react';
import { lookupProductPriceAction } from '@/lib/staff/actions';
import type { ProductPriceCheckResult } from '@/lib/staff/types';
import { PriceScanCard } from '@/components/staff/pricecheck/price-scan-card';
import { MarginSimulator } from '@/components/staff/pricecheck/margin-simulator';
import { PriceScheduleTable } from '@/components/staff/pricecheck/price-schedule-table';
import { usePunchStore } from '@/lib/store/punch-store';
import { getRolePrimaryRoute } from '@/lib/staff/navigation';

export default function StaffPriceCheckPage() {
  const router = useRouter();
  const { currentStaffRole } = usePunchStore();
  const isUnauthorizedRole = Boolean(
    currentStaffRole && currentStaffRole !== 'inventory_clerk' && currentStaffRole !== 'admin'
  );

  useEffect(() => {
    if (isUnauthorizedRole) {
      const { targetPath } = getRolePrimaryRoute(currentStaffRole);
      const notificationMessage =
        'Redirected: Item Code Price Check is restricted to inventory clerks and administrators.';
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('swift_staff_redirect_toast', notificationMessage);
        }
      } catch {}
      router.replace(targetPath);
    }
  }, [isUnauthorizedRole, currentStaffRole, router]);

  const [query, setQuery] = useState('YAM-NMAX-BL01');
  const [lookupResult, setLookupResult] = useState<ProductPriceCheckResult | null>(null);
  const [isSearching, startTransition] = useTransition();

  const executeLookup = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setLookupResult(null);
      return;
    }

    startTransition(async () => {
      try {
        const res = await lookupProductPriceAction(trimmed);
        setLookupResult(res);
      } catch {
        setLookupResult({
          success: false,
          code: 'DATABASE_ERROR',
          error: 'Unable to query product price at this time.',
        });
      }
    });
  }, []);

  // Debounced lookup on typing (100ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(() => {
      executeLookup(trimmed);
    }, 100);

    return () => clearTimeout(timer);
  }, [query, executeLookup]);

  // Immediate lookup on Enter keypress (hardware barcode scanner carriage return)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeLookup(query);
    }
  };

  const hasQuery = query.trim().length > 0;
  const matchedProduct = hasQuery && lookupResult?.success ? lookupResult.product : null;
  const showEmptyState = hasQuery && lookupResult && !lookupResult.success;

  if (isUnauthorizedRole) {
    const { targetPath } = getRolePrimaryRoute(currentStaffRole);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in">
        <div className="p-4 rounded-full bg-secondary/10 text-secondary mb-4">
          <AlertCircle className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Redirecting to Authorized Tool</h2>
        <p className="text-sm text-text-muted max-w-md mb-4">
          Item Code Price Check is restricted to inventory clerks and administrators.
        </p>
        <button
          type="button"
          onClick={() => router.replace(targetPath)}
          className="px-4 py-2 rounded-md bg-secondary text-white font-medium text-xs hover:bg-secondary-hover cursor-pointer"
        >
          Proceed to Workspace
        </button>
      </div>
    );
  }

  return (
    <div
      id="view-staff-pricecheck"
      className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200"
    >
      {/* 1. Barcode & SKU Lookup Scanner Box (mockup/staff.html lines 226-238) */}
      <div className="p-6 bg-bg-surface border border-border rounded-xl shadow-xs space-y-4">
        {hasQuery && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setLookupResult(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg-base border border-border text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}

        {/* Input Bar with Instant Button */}
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <input
              id="priceScanInput"
              name="priceScanInput"
              type="text"
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                if (!val.trim()) {
                  setLookupResult(null);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter SKU (e.g. YAM-NMAX-BL01, HON-CLK-CVTB) or scan barcode..."
              className="w-full py-3 px-4 bg-bg-input border-2 border-primary focus:ring-4 focus:ring-primary/20 rounded-xl font-mono text-base font-bold text-text-primary outline-hidden transition-all"
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3.5 top-3.5 flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => executeLookup(query)}
            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Search className="w-4 h-4" />
            <span>Check Price</span>
          </button>
        </div>
      </div>

      {/* 2. Result Card Container (Scenario 1, 2, 3) */}
      {matchedProduct && (
        <div className="space-y-4">
          <PriceScanCard product={matchedProduct} />
          {/* Interactive Margin Simulator */}
          <MarginSimulator product={matchedProduct} />
        </div>
      )}

      {/* 3. Empty State (Scenario 4) */}
      {showEmptyState && (
        <div
          id="priceScanResultBox"
          className="p-8 bg-bg-surface border border-danger/30 rounded-xl shadow-xs text-center space-y-2 animate-in fade-in duration-150"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-danger-light text-danger flex items-center justify-center">
            <SearchX className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-danger">
            {lookupResult.error || `No item found for barcode / code: "${query}"`}
          </div>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Please verify SKU formatting, scan an alternate product barcode, or select an item from the reference price schedule table below.
          </p>
        </div>
      )}

      {/* 4. Base Product Price Schedule Data Table (Scenario 4 & mockup/staff.html lines 240-270) */}
      <PriceScheduleTable
        onSelectSku={(sku) => {
          setQuery(sku);
          executeLookup(sku);
        }}
        activeSku={matchedProduct?.sku}
      />
    </div>
  );
}
