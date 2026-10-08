'use client';

import React, { useState, useMemo } from 'react';
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

export function InventoryCatalog() {
  const { products, adjustStock } = useInventoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<StockFilterOption>('all');
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

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
      stockStatus: stockFilter
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setStockFilter('all');
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

  return (
    <div className="space-y-6 animate-fadeIn">
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
        onResetFilters={handleResetFilters}
        totalCount={products.length}
        filteredCount={filteredProducts.length}
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
    </div>
  );
}
