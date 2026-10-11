'use client';

import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useInventoryStore } from '@/lib/store/inventory-store';
import {
  filterCatalogProducts,
  calculateCatalogStats,
  StockFilterOption
} from '@/lib/inventory/catalog-filter';
import { Product } from '@/lib/types/product';
import { AdjustmentType } from '@/lib/inventory/stock-adjustment';
import { InventoryStatsCards } from './inventory-stats-cards';
import { CatalogFilterBar } from './catalog-filter-bar';
import { CatalogTable } from './catalog-table';
import { CatalogEmptyState } from './catalog-empty-state';
import { StockAdjustmentModal } from './stock-adjustment-modal';
import { ProductRegistrationModal } from './product-registration-modal';

export function InventoryCatalog() {
  const { products, adjustStock, registerProduct } = useInventoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<StockFilterOption>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Compute unique categories from current product catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) {
        set.add(p.category);
      }
    }
    return Array.from(set).sort();
  }, [products]);

  // Aggregate KPI stats across full inventory
  const stats = useMemo(() => {
    return calculateCatalogStats(products);
  }, [products]);

  // Filter products by query, category, and stock status
  const filteredProducts = useMemo(() => {
    return filterCatalogProducts(products, {
      query: searchQuery,
      category: selectedCategory,
      stockStatus: stockFilter,
      lowStockOnly
    });
  }, [products, searchQuery, selectedCategory, stockFilter, lowStockOnly]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setStockFilter('all');
    setLowStockOnly(false);
  };

  const handleAdjustStock = (sku: string) => {
    const target = products.find((p) => p.sku === sku);
    if (target) {
      setAdjustingProduct(target);
      setIsAdjustModalOpen(true);
    }
  };

  const handleConfirmAdjustment = ({
    sku,
    type,
    delta,
    reason
  }: {
    sku: string;
    type: AdjustmentType;
    delta: number;
    reason: string;
  }) => {
    adjustStock({
      sku,
      type,
      units: delta,
      reason,
      user: 'Inventory Supervisor (Admin)'
    });
  };

  const handleRegisterProduct = (newProduct: Product) => {
    const res = registerProduct({
      product: newProduct,
      user: 'Carlos Rodriguez (Admin)'
    });

    if (res.success) {
      setToastMessage({
        type: 'success',
        text: `Product "${newProduct.name}" (${newProduct.sku}) registered successfully!`
      });
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    } else {
      setToastMessage({
        type: 'error',
        text: res.error || 'Failed to register product.'
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          className={`p-3.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md transition-all animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-success-light text-success border-success/30'
              : 'bg-danger-light text-danger border-danger/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <InventoryStatsCards stats={stats} />

      {/* Real-time Multi-attribute Search & Filtering Toolbar */}
      <CatalogFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        lowStockOnly={lowStockOnly}
        onToggleLowStockOnly={() => setLowStockOnly((prev) => !prev)}
        criticalLowStockCount={stats.criticalLowStockCount}
        onResetFilters={handleResetFilters}
        totalCount={products.length}
        filteredCount={filteredProducts.length}
        onAddPart={() => setIsAddProductModalOpen(true)}
      />

      {/* Catalog Grid Table or Empty State */}
      {filteredProducts.length > 0 ? (
        <CatalogTable
          products={filteredProducts}
          onAdjustStock={handleAdjustStock}
        />
      ) : (
        <CatalogEmptyState
          onResetFilters={handleResetFilters}
          searchQuery={searchQuery}
        />
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        product={adjustingProduct}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustingProduct(null);
        }}
        onSubmit={handleConfirmAdjustment}
      />

      {/* New Product Registration Modal */}
      <ProductRegistrationModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSubmit={handleRegisterProduct}
        existingSkus={products.map((p) => p.sku)}
      />
    </div>
  );
}
