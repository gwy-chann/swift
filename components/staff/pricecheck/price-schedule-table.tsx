'use client';

import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mock-data/products';
import { computeGrossMarkupPercent } from '@/lib/staff/margin-math';
import { ShelfLocationTag } from '@/components/inventory/shelf-location-tag';

export interface PriceScheduleTableProps {
  onSelectSku: (sku: string) => void;
  activeSku?: string;
}

export function PriceScheduleTable({ onSelectSku, activeSku }: Readonly<PriceScheduleTableProps>) {
  // Show top high-velocity reference products from catalog
  const referenceItems = MOCK_PRODUCTS.slice(0, 8);

  return (
    <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-text-primary">
            Base Product Price Schedule (Wholesale vs Retail)
          </h4>
        </div>
        <span className="text-xs text-text-muted">
          Click any row to scan SKU instantly
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-bg-base/60 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Product Description</th>
              <th className="py-3 px-4">Wholesale Price</th>
              <th className="py-3 px-4">Retail Price</th>
              <th className="py-3 px-4">Gross Markup</th>
              <th className="py-3 px-4">Shelf Location</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {referenceItems.map((item) => {
              const markup = computeGrossMarkupPercent(item.retail, item.cost);
              const isSelected = activeSku?.toUpperCase() === item.sku.toUpperCase();

              return (
                <tr
                  key={item.sku}
                  onClick={() => onSelectSku(item.sku)}
                  className={`group hover:bg-bg-hover transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary/5 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold text-text-primary">
                    {item.sku}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-text-primary">{item.name}</div>
                    <div className="text-[10px] text-text-muted">{item.category} • {item.model}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-warning">
                    ₱{item.wholesale.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-success">
                    ₱{item.retail.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-light text-primary">
                      {markup}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <ShelfLocationTag location={item.location} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSku(item.sku);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary group-hover:underline cursor-pointer"
                    >
                      <span>Scan</span>
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
