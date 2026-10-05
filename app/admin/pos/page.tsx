import React from "react";
import { ShoppingCart } from "lucide-react";

export default function AdminPosPage() {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Point of Sale (POS) Cashier</h2>
          <p className="text-xs text-text-secondary">
            Hybrid billing for parts sales, workshop bay labor line items, and dual-tier pricing.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-lg bg-bg-card border border-border text-center">
        <p className="text-sm font-semibold text-text-primary">
          💳 POS & Hybrid Billing Engine (EPIC-3)
        </p>
        <p className="text-xs text-text-muted mt-1">
          Scheduled for implementation under Jira stories SIAA-18 through SIAA-22.
        </p>
      </div>
    </div>
  );
}
