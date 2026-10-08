import React from 'react';
import { PackageSearch, RotateCcw } from 'lucide-react';

interface CatalogEmptyStateProps {
  onResetFilters: () => void;
  searchQuery?: string;
}

export function CatalogEmptyState({ onResetFilters, searchQuery }: CatalogEmptyStateProps) {
  return (
    <div className="p-12 text-center rounded-lg bg-bg-card border border-border flex flex-col items-center justify-center shadow-xs">
      <div className="w-14 h-14 rounded-full bg-bg-muted flex items-center justify-center text-text-muted mb-4">
        <PackageSearch className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-text-primary">No parts found matching criteria</h3>
      <p className="text-xs sm:text-sm text-text-secondary max-w-md mt-1 mb-5">
        {searchQuery
          ? `We couldn't find any products matching "${searchQuery}". Try checking the spelling, selecting another category, or clearing active filters.`
          : 'No motorcycle parts match the current category and stock level filters.'}
      </p>
      <button
        type="button"
        onClick={onResetFilters}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-md bg-primary hover:bg-primary-hover text-text-light transition-all cursor-pointer shadow-xs"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Reset All Filters</span>
      </button>
    </div>
  );
}
