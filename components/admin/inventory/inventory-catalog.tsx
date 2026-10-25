'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { CatalogPagination } from './catalog-pagination';
import { StockAdjustmentModal } from './stock-adjustment-modal';
import { ProductRegistrationModal } from './product-registration-modal';
import {
  adjustProductStockAction,
  createProductAction
} from '@/lib/admin/product-actions';
import { useInventoryRealtime } from '@/lib/hooks/use-inventory-realtime';
import { usePricingRulesRealtime } from '@/lib/hooks/use-pricing-rules-realtime';
import type { PricingRules } from '@/lib/types/pricing';

export interface InventoryCatalogProps {
  initialProducts?: Product[];
  initialPricingRules?: PricingRules;
  showHeader?: boolean;
  initialStockFilter?: StockFilterOption;
  initialLowStockOnly?: boolean;
}

export function InventoryCatalog({
  initialProducts,
  initialPricingRules,
  showHeader = false,
  initialStockFilter = 'all',
  initialLowStockOnly = false
}: InventoryCatalogProps = {}) {
  const { products, adjustStock, rollbackStock, registerProduct, hydrateProducts } = useInventoryStore();
  const [pricingRules, setPricingRules] = useState<PricingRules | undefined>(initialPricingRules);

  usePricingRulesRealtime({
    onUpdate: (updated) => {
      setPricingRules(updated);
    }
  });

  // Hydrate store on mount if server pre-fetched products are provided
  React.useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      hydrateProducts(initialProducts);
    }
  }, [initialProducts, hydrateProducts]);

  // Subscribe to multi-terminal Supabase Realtime stock changes & low-stock alerts
  useInventoryRealtime({
    onLowStock: (product) => {
      setToastMessage({
        type: 'error',
        text: `⚠️ Low Stock Alert: Part ${product.sku} (${product.name}) has dropped to ${product.stock} units (Minimum threshold: ${product.minThreshold}).`
      });
      setTimeout(() => {
        setToastMessage(null);
      }, 7000);
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<StockFilterOption>(initialStockFilter);
  const [lowStockOnly, setLowStockOnly] = useState(initialLowStockOnly);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    return Array.from(set).sort((a, b) => a.localeCompare(b));
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
    setCurrentPage(1);
  };

  // Reset pagination to page 1 whenever search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, stockFilter, lowStockOnly]);

  // Clamp current page when total items / page size changes
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredProducts.length, pageSize, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleAdjustStock = (sku: string) => {
    const target = products.find((p) => p.sku === sku);
    if (target) {
      setAdjustingProduct(target);
      setIsAdjustModalOpen(true);
    }
  };

  const handleConfirmAdjustment = async ({
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
    // 1. Instant Optimistic State Update (<16ms)
    const snapshot = adjustStock({
      sku,
      type,
      units: delta,
      reason,
      user: 'Inventory Supervisor (Admin)'
    });

    setIsAdjustSubmitting(true);

    try {
      // 2. Invoke Server Action calling Supabase RPC adjust_product_stock
      const result = await adjustProductStockAction({
        sku,
        type,
        delta,
        reason,
        userName: 'Inventory Supervisor (Admin)'
      });

      if (result.success) {
        setToastMessage({
          type: 'success',
          text: `Stock adjusted successfully for part ${sku} (${delta > 0 ? '+' : ''}${delta} units). New on-hand: ${result.newStock}.`
        });
        setTimeout(() => {
          setToastMessage(null);
        }, 5000);
      } else {
        // 3. Rollback on Rejection (e.g. INSUFFICIENT_STOCK)
        rollbackStock({
          sku,
          previousStock: snapshot.previousStock,
          logId: snapshot.logId
        });

        setToastMessage({
          type: 'error',
          text: result.error || `Stock adjustment failed for ${sku}. Count reverted.`
        });
        setTimeout(() => {
          setToastMessage(null);
        }, 6000);
      }
    } catch {
      // 4. Rollback on Network Error or Unhandled Exception
      rollbackStock({
        sku,
        previousStock: snapshot.previousStock,
        logId: snapshot.logId
      });

      setToastMessage({
        type: 'error',
        text: `Network error adjusting stock for ${sku}. Count reverted to previous quantity.`
      });
      setTimeout(() => {
        setToastMessage(null);
      }, 6000);
    } finally {
      setIsAdjustSubmitting(false);
    }
  };

  const handleRegisterProduct = async (
    newProduct: Product
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await createProductAction({
        sku: newProduct.sku,
        name: newProduct.name,
        category: newProduct.category,
        brand: newProduct.brand,
        model: newProduct.model,
        cost: newProduct.cost,
        wholesale: newProduct.wholesale,
        retail: newProduct.retail,
        stock: newProduct.stock,
        minThreshold: newProduct.minThreshold,
        location: newProduct.location,
        oem: newProduct.oem,
        imageUrl: newProduct.imageUrl,
        description: newProduct.description,
        userName: 'Carlos Rodriguez (Admin)'
      });

      if (result.success && result.product) {
        registerProduct({
          product: result.product,
          user: 'Carlos Rodriguez (Admin)'
        });

        setToastMessage({
          type: 'success',
          text: `Product "${result.product.name}" (${result.product.sku}) registered successfully!`
        });
        setTimeout(() => {
          setToastMessage(null);
        }, 5000);
        return { success: true };
      } else {
        const errorMsg = result.error || 'Failed to register product.';
        setToastMessage({
          type: 'error',
          text: errorMsg
        });
        setTimeout(() => {
          setToastMessage(null);
        }, 6000);
        return { success: false, error: errorMsg };
      }
    } catch {
      const errorMsg = 'Network error while registering product.';
      setToastMessage({
        type: 'error',
        text: errorMsg
      });
      setTimeout(() => {
        setToastMessage(null);
      }, 6000);
      return { success: false, error: errorMsg };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <output
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
        </output>
      )}

      {/* Real-time Multi-attribute Search, Filters & Add Part Action Toolbar */}
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

      {/* 4 Summary KPI Cards */}
      <InventoryStatsCards stats={stats} />

      {/* Catalog Grid Table with Pagination or Empty State */}
      {filteredProducts.length > 0 ? (
        <div className="space-y-4">
          <CatalogTable
            products={paginatedProducts}
            onAdjustStock={handleAdjustStock}
          />
          <CatalogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
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
        isSubmitting={isAdjustSubmitting}
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
        pricingRules={pricingRules}
      />
    </div>
  );
}
