"use client";

import React, { useState } from "react";
import { Barcode } from "lucide-react";

export default function StaffPriceCheckPage() {
  const [skuInput, setSkuInput] = useState("FL-MOT-10W40");

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
      {/* Price Check Barcode Input */}
      <div className="p-6 bg-bg-surface border border-border rounded-xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Barcode className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary">Instant Barcode & Price Checker</h3>
          <p className="text-xs text-text-muted">Scan barcode or enter SKU code for customer price inquiries</p>
        </div>

        <div className="relative max-w-md mx-auto">
          <input
            type="text"
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            placeholder="Scan barcode or type SKU..."
            className="w-full text-center py-3 px-4 bg-bg-input border-2 border-primary focus:ring-4 focus:ring-primary/20 rounded-xl font-mono text-base font-bold text-text-primary outline-hidden"
          />
        </div>
      </div>

      {/* Result Card */}
      <div className="p-6 bg-bg-card border border-border rounded-xl shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-text-muted font-bold">FL-MOT-10W40</span>
            <h4 className="text-lg font-bold text-text-primary mt-1">Motul 7100 4T 10W-40 100% Synthetic 1L</h4>
            <span className="text-xs text-secondary font-semibold">Location: Aisle 3 - Shelf B</span>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-success-light text-success text-xs font-extrabold">
            IN STOCK (24 Units)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="p-3 bg-bg-base border border-border rounded-lg">
            <span className="text-[11px] text-text-muted font-bold block">Retail Price (SRP)</span>
            <span className="text-lg font-black font-mono text-primary">₱650.00</span>
          </div>

          <div className="p-3 bg-bg-base border border-border rounded-lg">
            <span className="text-[11px] text-text-muted font-bold block">Wholesale (Bulk 5+)</span>
            <span className="text-lg font-black font-mono text-secondary">₱580.00</span>
          </div>

          <div className="p-3 bg-bg-base border border-border rounded-lg col-span-2 sm:col-span-1">
            <span className="text-[11px] text-text-muted font-bold block">SC / PWD (20% Off)</span>
            <span className="text-lg font-black font-mono text-text-primary">₱520.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
