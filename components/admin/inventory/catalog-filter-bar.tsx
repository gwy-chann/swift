import React from 'react';
import { Search, X, Filter, RotateCcw, AlertTriangle } from 'lucide-react';
import { StockFilterOption } from '@/lib/inventory/catalog-filter';

interface CatalogFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  stockFilter: StockFilterOption;
  onStockFilterChange: (value: StockFilterOption) => void;
  lowStockOnly?: boolean;
  onToggleLowStockOnly?: () => void;
  criticalLowStockCount?: number;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export function CatalogFilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  stockFilter,
  onStockFilterChange,
  lowStockOnly = false,
  onToggleLowStockOnly,
  criticalLowStockCount,
  onResetFilters,
  totalCount,
  filteredCount
}: CatalogFilterBarProps) {
  const isFiltered =
    searchQuery.trim().length > 0 ||
    (selectedCategory !== 'All' && selectedCategory !== 'All Categories') ||
    stockFilter !== 'all' ||
    lowStockOnly;

  return (
    <div className="p-4 rounded-lg bg-bg-card border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
      {/* Search Input Box */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search SKU, part name, brand, model fitment, rack..."
          aria-label="Search parts catalog"
          className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-bg-input text-text-primary rounded-md border border-border focus:outline-hidden focus:border-border-focus focus:ring-1 focus:ring-border-focus placeholder:text-text-muted transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search query"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Selectors Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Dropdown */}
        <div className="relative flex-1 sm:flex-initial">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by product category"
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-bg-input text-text-primary rounded-md border border-border focus:outline-hidden focus:border-border-focus focus:ring-1 focus:ring-border-focus cursor-pointer transition-colors"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Low Stock Alerts Quick-Filter Toggle Button */}
        <button
          type="button"
          onClick={onToggleLowStockOnly}
          aria-pressed={lowStockOnly}
          aria-label="Toggle low stock alerts quick-filter"
          className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-md border transition-all cursor-pointer shadow-2xs ${
            lowStockOnly
              ? 'bg-danger text-text-light border-danger ring-2 ring-danger/30'
              : 'bg-bg-input hover:bg-bg-hover text-text-primary border-border hover:border-danger/40'
          }`}
        >
          <AlertTriangle
            className={`w-3.5 h-3.5 shrink-0 ${
              lowStockOnly ? 'text-text-light' : 'text-danger'
            }`}
          />
          <span>Low Stock Alerts</span>
          {typeof criticalLowStockCount === 'number' && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                lowStockOnly
                  ? 'bg-black/30 text-text-light'
                  : 'bg-danger-light text-danger'
              }`}
            >
              {criticalLowStockCount}
            </span>
          )}
        </button>

        {/* Stock Status Dropdown */}
        <div className="relative flex-1 sm:flex-initial">
          <select
            value={stockFilter}
            onChange={(e) => onStockFilterChange(e.target.value as StockFilterOption)}
            aria-label="Filter by stock availability"
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-bg-input text-text-primary rounded-md border border-border focus:outline-hidden focus:border-border-focus focus:ring-1 focus:ring-border-focus cursor-pointer transition-colors"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock (&gt; Min)</option>
            <option value="low_stock">Low Stock (≤ Min)</option>
            <option value="out_of_stock">Out of Stock (0 Units)</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            aria-label="Reset all filters"
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-md bg-bg-muted hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border-subtle transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}

        {/* Results Counter Pill */}
        <div className="hidden lg:flex items-center px-2.5 py-1.5 rounded text-xs font-semibold bg-bg-muted text-text-muted border border-border-subtle shrink-0">
          <Filter className="w-3 h-3 mr-1.5 text-text-muted" />
          <span>
            {filteredCount} of {totalCount} parts
          </span>
        </div>
      </div>
    </div>
  );
}
