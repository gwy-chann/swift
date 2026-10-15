'use client';

import React from 'react';
import { Tag, TrendingUp, ShieldCheck, Box } from 'lucide-react';
import type { ProductPriceCheckItem } from '@/lib/staff/types';
import { ShelfLocationTag } from '@/components/inventory/shelf-location-tag';

function getStockBadgeClass(stock: number, minThreshold: number): string {
  if (stock > minThreshold) {
    return 'bg-success-light text-success border border-success/30';
  }
  if (stock > 0) {
    return 'bg-accent-light text-accent border border-accent/30';
  }
  return 'bg-danger-light text-danger border border-danger/30';
}

function getStockStatusLabel(stock: number, minThreshold: number): string {
  if (stock > minThreshold) {
    return `IN STOCK (${stock} Units)`;
  }
  if (stock > 0) {
    return `LOW STOCK (${stock} Units)`;
  }
  return 'OUT OF STOCK (0 Units)';
}

export interface PriceScanCardProps {
  product: ProductPriceCheckItem;
}

export function PriceScanCard({ product }: Readonly<PriceScanCardProps>) {
  return (
    <div
      id="priceScanResultBox"
      className="p-6 bg-bg-card border border-border rounded-xl shadow-xs space-y-5 animate-in fade-in duration-150"
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider text-text-muted">
              {product.sku}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-muted text-text-secondary">
              {product.category}
            </span>
            {product.brand && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-bg-base border border-border text-text-muted">
                {product.brand}
              </span>
            )}
          </div>
          <h4 className="text-lg font-bold text-text-primary">{product.name}</h4>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ShelfLocationTag location={product.location} />
            {product.model && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Box className="w-3.5 h-3.5" />
                Fitment: {product.model}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <span
            className={`inline-block px-3 py-1 rounded-md text-xs font-extrabold ${getStockBadgeClass(
              product.stock,
              product.minThreshold
            )}`}
          >
            {getStockStatusLabel(product.stock, product.minThreshold)}
          </span>
        </div>
      </div>

      {/* 4-Box Metric Grid (mockup/staff.html & app.js parity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Wholesale Price (Warning Gold) */}
        <div className="p-3.5 bg-bg-base border border-border rounded-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">
              Wholesale Price
            </span>
            <span className="text-[10px] font-semibold text-warning bg-warning-light px-1.5 py-0.5 rounded">
              +{product.wholesaleMarkupPercent}%
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-warning">
            ₱{product.wholesalePrice.toFixed(2)}
          </div>
          <span className="text-[10px] text-text-muted block">Bulk &amp; Fleet Partners</span>
        </div>

        {/* 2. Retail Price / SRP (Success Green) */}
        <div className="p-3.5 bg-bg-base border border-border rounded-lg space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-text-muted font-bold uppercase tracking-wider">
              <Tag className="w-3 h-3 text-success" />
              <span>Retail Price</span>
            </div>
            <span className="text-[10px] font-semibold text-success bg-success-light px-1.5 py-0.5 rounded">
              SRP
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-success">
            ₱{product.retailPrice.toFixed(2)}
          </div>
          <span className="text-[10px] text-text-muted block">Walk-In Counter Price</span>
        </div>

        {/* 3. Base Acquisition Cost & Gross Markup % */}
        <div className="p-3.5 bg-bg-base border border-border rounded-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">
              Cost &amp; Markup
            </span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary-light px-1.5 py-0.5 rounded">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>{product.grossMarkupPercent}%</span>
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-text-primary">
            ₱{product.cost.toFixed(2)}
          </div>
          <span className="text-[10px] text-text-muted block">
            Base Cost (Gross Profit: ₱{(product.retailPrice - product.cost).toFixed(2)})
          </span>
        </div>

        {/* 4. Statutory SC / PWD 20% Discount (RA 9994 / RA 10754) */}
        <div className="p-3.5 bg-bg-base border border-border rounded-lg space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-text-muted font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-secondary" />
              <span>SC / PWD</span>
            </div>
            <span className="text-[10px] font-bold text-secondary bg-secondary-light px-1.5 py-0.5 rounded">
              -20%
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-secondary">
            ₱{product.scPwdPrice.toFixed(2)}
          </div>
          <span className="text-[10px] text-text-muted block">Mandated Senior / PWD Rate</span>
        </div>
      </div>
    </div>
  );
}
