'use client';

import React, { useState, useMemo } from 'react';
import { useInventoryStore } from '@/lib/store/inventory-store';
import {
  filterCatalogProducts,
  calculateCatalogStats,
  StockFilterOption
} from '@/lib/inventory/catalog-filter';
import { InventoryStatsCards } from './inventory-stats-cards';
import { CatalogFilterBar } from './catalog-filter-bar';
import { CatalogTable } from './catalog-table';
import { CatalogEmptyState } from './catalog-empty-state';

export function InventoryCatalog() {
  const { products } = useInventoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<StockFilterOption>('all');

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
    // Hook for stock adjustment modal (to be wired in SIAA-15)
    // Providing immediate user feedback and console tracing
    if (typeof window !== 'undefined') {
      console.log(`[Inventory] Requested stock adjustment for SKU: ${sku}`);
    }
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
    </div>
  );
}
