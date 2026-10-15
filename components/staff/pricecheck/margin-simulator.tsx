'use client';

import React, { useState } from 'react';
import { Calculator, RotateCcw, AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { simulateMarginOutput } from '@/lib/staff/margin-math';
import type { ProductPriceCheckItem } from '@/lib/staff/types';

function getMarginBadgeClass(status: 'profitable' | 'low_margin' | 'below_cost'): string {
  if (status === 'profitable') {
    return 'bg-success-light text-success';
  }
  if (status === 'low_margin') {
    return 'bg-accent-light text-accent';
  }
  return 'bg-danger-light text-danger';
}

function getMarginBadgeLabel(status: 'profitable' | 'low_margin' | 'below_cost'): string {
  if (status === 'profitable') {
    return 'Healthy Margin';
  }
  if (status === 'low_margin') {
    return 'Low Margin (<15%)';
  }
  return 'Below Cost';
}

export interface MarginSimulatorProps {
  product: ProductPriceCheckItem;
}

export function MarginSimulator({ product }: Readonly<MarginSimulatorProps>) {
  const [userPrice, setUserPrice] = useState<number | null>(null);
  const [prevProductId, setPrevProductId] = useState(product.id);

  if (product.id !== prevProductId) {
    setPrevProductId(product.id);
    setUserPrice(null);
  }

  const simulatedPrice = userPrice ?? product.retailPrice;

  const output = simulateMarginOutput({
    baseCost: product.cost,
    simulatedRetailPrice: simulatedPrice,
  });

  const handleAdjust = (delta: number) => {
    setUserPrice(Math.max(0, Number((simulatedPrice + delta).toFixed(2))));
  };

  const handleReset = () => {
    setUserPrice(null);
  };

  return (
    <div className="p-5 bg-bg-surface border border-border rounded-xl shadow-xs space-y-4">
      {/* Simulator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">Interactive Margin Simulator</h4>
            <p className="text-xs text-text-muted">
              Simulate custom deal prices against base acquisition cost (₱{product.cost.toFixed(2)})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg-base border border-border text-text-secondary hover:text-text-primary hover:bg-bg-muted transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to SRP</span>
        </button>
      </div>

      {/* Simulator Controls & Metric Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Proposed Retail Price Input */}
        <div className="lg:col-span-5 space-y-2">
          <label htmlFor="simulatedPriceInput" className="text-xs font-bold text-text-secondary block">
            Proposed Retail Price (₱)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-mono text-base font-bold text-text-muted">
              ₱
            </span>
            <input
              id="simulatedPriceInput"
              type="number"
              step="5"
              min="0"
              value={simulatedPrice}
              onChange={(e) => setUserPrice(Math.max(0, Number(e.target.value) || 0))}
              className="w-full pl-8 pr-3 py-2 bg-bg-input border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg font-mono text-base font-bold text-text-primary outline-hidden"
            />
          </div>

          {/* Quick Adjust Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleAdjust(-50)}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-bg-base border border-border text-text-secondary hover:bg-bg-muted cursor-pointer"
            >
              -₱50
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(-10)}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-bg-base border border-border text-text-secondary hover:bg-bg-muted cursor-pointer"
            >
              -₱10
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(10)}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-bg-base border border-border text-text-secondary hover:bg-bg-muted cursor-pointer"
            >
              +₱10
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(50)}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-bg-base border border-border text-text-secondary hover:bg-bg-muted cursor-pointer"
            >
              +₱50
            </button>
          </div>
        </div>

        {/* Live Simulation Readouts */}
        <div className="lg:col-span-7 grid grid-cols-3 gap-2.5">
          {/* Projected Gross Profit */}
          <div className="p-3 bg-bg-base border border-border rounded-lg space-y-1 text-center">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
              Gross Profit
            </span>
            <div
              className={`text-lg font-mono font-black ${
                output.isBelowCost ? 'text-danger' : 'text-success'
              }`}
            >
              {output.simulatedGrossProfit >= 0 ? '+' : ''}₱{output.simulatedGrossProfit.toFixed(2)}
            </div>
            <span className="text-[10px] text-text-muted block">
              vs ₱{product.cost.toFixed(2)} Cost
            </span>
          </div>

          {/* Projected Markup % */}
          <div className="p-3 bg-bg-base border border-border rounded-lg space-y-1 text-center">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
              Gross Markup
            </span>
            <div className="text-lg font-mono font-black text-text-primary flex items-center justify-center gap-1">
              {output.simulatedGrossMarkupPercent >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-success" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-danger" />
              )}
              <span>{output.simulatedGrossMarkupPercent}%</span>
            </div>
            <span className="text-[10px] text-text-muted block">On Base Cost</span>
          </div>

          {/* Margin Status Indicator */}
          <div className="p-3 bg-bg-base border border-border rounded-lg space-y-1 text-center flex flex-col justify-center items-center">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
              Profit Margin
            </span>
            <div className="text-sm font-bold flex items-center gap-1">
              {output.marginStatus === 'profitable' && (
                <span className="text-success inline-flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {output.simulatedGrossMarginPercent}%
                </span>
              )}
              {output.marginStatus === 'low_margin' && (
                <span className="text-accent inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {output.simulatedGrossMarginPercent}%
                </span>
              )}
              {output.marginStatus === 'below_cost' && (
                <span className="text-danger inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  LOSS
                </span>
              )}
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getMarginBadgeClass(output.marginStatus)}`}
            >
              {getMarginBadgeLabel(output.marginStatus)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
