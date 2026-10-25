import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

function getPaginationRange(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export function CatalogPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: Readonly<CatalogPaginationProps>) {
  if (totalItems === 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const pages = getPaginationRange(currentPage, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-bg-card border border-border rounded-lg shadow-xs text-xs sm:text-sm">
      {/* Items count & Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3 text-text-secondary">
        <div>
          Showing{' '}
          <span className="font-bold text-text-primary">{startIndex}</span>
          {' to '}
          <span className="font-bold text-text-primary">{endIndex}</span>
          {' of '}
          <span className="font-bold text-text-primary">{totalItems}</span>
          {' parts'}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-border pl-3">
            <span className="text-text-muted text-xs">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Parts per page"
              className="px-2 py-1 bg-bg-input text-text-primary rounded border border-border focus:outline-hidden focus:border-border-focus text-xs cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Pagination Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          className="p-1.5 rounded-md border border-border bg-bg-input hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="p-1.5 rounded-md border border-border bg-bg-input hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Desktop Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-text-muted select-none"
                >
                  …
                </span>
              );
            }

            const pageNum = Number(p);
            const isCurrent = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${pageNum}`}
                className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-primary text-text-light font-bold shadow-xs'
                    : 'bg-bg-input hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Mobile Page Indicator */}
        <div className="sm:hidden px-2 text-xs font-semibold text-text-secondary">
          {currentPage} / {totalPages}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-md border border-border bg-bg-input hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          className="p-1.5 rounded-md border border-border bg-bg-input hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
