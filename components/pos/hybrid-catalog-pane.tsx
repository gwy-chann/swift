'use client';

import React, { useState, useMemo } from 'react';
import { Zap, Search, ShieldAlert, AlertTriangle, Wrench } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { StockBadge } from '@/components/inventory/stock-badge';
import type { Product, LaborService } from '@/lib/types';

export interface HybridCatalogPaneProps {
  products: Product[];
  laborServices: LaborService[];
  onSelectProduct: (product: Product) => void;
  onSelectService: (service: LaborService) => void;
  title?: string;
}

export function HybridCatalogPane({
  products,
  laborServices,
  onSelectProduct,
  onSelectService,
  title = 'Fast-Lane Checkout'
}: Readonly<HybridCatalogPaneProps>) {
  const { pricingMode } = useCartStore();
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Map labor services to unified catalog item shape for combined rendering
  const mappedLaborServices = useMemo<Product[]>(() => {
    return laborServices.map((srv) => ({
      sku: srv.code,
      name: srv.name,
      category: 'SERVICES',
      stock: 999,
      minThreshold: 0,
      location: srv.bay,
      cost: srv.rate * 0.5,
      wholesale: srv.rate,
      retail: srv.rate,
      oem: false,
      model: srv.duration,
      brand: 'Swift Workshop',
      description: srv.description
    }));
  }, [laborServices]);

  // Combine products with labor services
  const allPosItems = useMemo(() => {
    return [...products, ...mappedLaborServices];
  }, [products, mappedLaborServices]);

  // Dynamic category list
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('ALL');
    set.add('SERVICES');
    for (const p of products) {
      if (p.category && p.category !== 'SERVICES') {
        set.add(p.category);
      }
    }
    return Array.from(set);
  }, [products]);

  // Filter items by category & search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPosItems.filter((item) => {
      const matchCat =
        activeCategory === 'ALL' ||
        (activeCategory === 'SERVICES'
          ? item.category === 'SERVICES'
          : item.category.toLowerCase() === activeCategory.toLowerCase());

      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q);

      return matchCat && matchQuery;
    });
  }, [allPosItems, activeCategory, searchQuery]);

  const handleItemClick = (item: Product) => {
    if (item.category === 'SERVICES') {
      const srv = laborServices.find((s) => s.code === item.sku);
      if (srv) {
        onSelectService(srv);
      } else {
        onSelectService({
          code: item.sku,
          name: item.name,
          bay: item.location ?? 'Bay 1',
          rate: item.retail,
          duration: item.model ?? '30 mins',
          description: item.description
        });
      }
    } else {
      onSelectProduct(item);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return;

      const matched = allPosItems.find(
        (i) => i.sku.toLowerCase() === query || i.name.toLowerCase().includes(query)
      );

      if (matched) {
        handleItemClick(matched);
        setSearchQuery('');
      }
    }
  };

  const getItemPrice = (item: Product) => {
    return pricingMode === 'wholesale' ? item.wholesale : item.retail;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Catalog Header */}
      <div className="p-4 border-b border-border bg-bg-surface/50 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            {pricingMode === 'wholesale' && (
              <span
                data-testid="catalog-wholesale-indicator"
                className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 tracking-wide"
              >
                Wholesale Tier Active
              </span>
            )}
          </div>
          <div className="relative sm:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Scan Barcode / SKU & hit [ENTER]..."
              aria-label="Scan or search parts and services"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-input border border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted outline-hidden transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const categoryLabels: Record<string, string> = {
              ALL: 'All Fast Items',
              SERVICES: 'Add Labor / Bay Service'
            };
            const label = categoryLabels[cat] ?? cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-primary text-text-light shadow-xs'
                    : 'bg-bg-base text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Item Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-text-muted">
            <p className="text-xs font-semibold">No items match your search or filter</p>
            <p className="text-[11px] mt-1">Try searching for a different keyword or SKU</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const isService = item.category === 'SERVICES';
              const isOutOfStock = !isService && item.stock <= 0;
              const isLowStock = !isService && item.stock > 0 && item.stock <= item.minThreshold;
              const price = getItemPrice(item);

              const renderActionBadge = () => {
                if (isOutOfStock) {
                  return (
                    <span className="text-[11px] font-bold text-danger flex items-center gap-1 group-hover:underline">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Override</span>
                    </span>
                  );
                }
                if (isLowStock) {
                  return (
                    <span className="text-[11px] font-bold text-danger flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>+ Add</span>
                    </span>
                  );
                }
                return (
                  <span className="text-[11px] font-semibold text-text-muted group-hover:text-primary flex items-center gap-1">
                    <span>+ Add</span>
                  </span>
                );
              };

              return (
                <button
                  type="button"
                  key={item.sku}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 bg-bg-card border rounded-lg flex flex-col justify-between gap-2.5 transition-all shadow-xs group cursor-pointer text-left w-full ${
                    isOutOfStock
                      ? 'border-danger/30 hover:border-danger/60 bg-danger-light/10'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono text-text-muted font-bold">
                        {item.sku}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-muted font-bold text-text-secondary">
                        {item.location || 'Floor Stock'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-text-primary group-hover:text-primary mt-1 line-clamp-2">
                      {item.name}
                    </h4>

                    <div className="mt-1.5 flex items-center gap-2">
                      {!isService ? (
                        <StockBadge stock={item.stock} minThreshold={item.minThreshold} compact />
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-light text-primary border border-primary/20 flex items-center gap-1">
                            <Wrench className="w-2.5 h-2.5" />
                            <span>Workshop Service</span>
                          </span>
                          {item.model && (
                            <span className="text-[10px] text-text-muted font-medium">
                              Est: {item.model}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-extrabold font-mono text-primary">
                        ₱{price.toFixed(2)}
                      </span>
                      {pricingMode === 'wholesale' && !isService && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-accent bg-accent/15 border border-accent/30 px-1 py-0.5 rounded">
                          Wholesale
                        </span>
                      )}
                    </div>
                    {renderActionBadge()}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
