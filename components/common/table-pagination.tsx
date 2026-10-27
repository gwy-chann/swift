'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemName?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

import { getPaginationRange, paginateArray } from '@/lib/pagination/pagination-utils';
export { getPaginationRange, paginateArray };

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemName = 'items',
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className = '',
}: Readonly<TablePaginationProps>) {
  if (totalItems === 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const pages = getPaginationRange(currentPage, totalPages);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-bg-surface border-t border-border text-xs sm:text-sm ${className}`}
    >
      {/* Items count & Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3 text-text-secondary">
        <div>
          Showing{' '}
          <span className="font-bold text-text-primary">{startIndex}</span>
          {' to '}
          <span className="font-bold text-text-primary">{endIndex}</span>
          {' of '}
          <span className="font-bold text-text-primary">{totalItems}</span>
          {' '}{itemName}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-border pl-3">
            <span className="text-text-muted text-xs">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label={`${itemName} per page`}
              className="px-2 py-1 bg-bg-card text-text-primary rounded border border-border focus:outline-hidden focus:border-primary text-xs cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
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
          className="p-1.5 rounded-md border border-border bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="p-1.5 rounded-md border border-border bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors cursor-pointer"
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
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border'
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
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-md border border-border bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Last page"
          className="p-1.5 rounded-md border border-border bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Client-side pagination state hook
 */
export function usePagination<T>(items: readonly T[] | T[], defaultPageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (effectivePage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, effectivePage, pageSize]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage: effectivePage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    resetPage,
    setCurrentPage,
  };
}
