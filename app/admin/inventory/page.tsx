import React from 'react';
import { Boxes } from 'lucide-react';
import { InventoryCatalog } from '@/components/admin/inventory/inventory-catalog';

export const metadata = {
  title: 'Inventory & Warehouse Stock | SWIFT Admin',
  description: 'Master parts catalog, warehouse shelf locator mapping, and real-time inventory search.'
};

export default function AdminInventoryPage() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Inventory & Warehouse Stock
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Master parts catalog, warehouse shelf locator mapping, and stock adjustments.
            </p>
          </div>
        </div>
      </div>

      {/* Main Reactive Inventory Catalog View */}
      <InventoryCatalog />
    </div>
  );
}
