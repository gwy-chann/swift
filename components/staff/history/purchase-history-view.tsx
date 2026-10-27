'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Printer,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Calendar,
  User,
  ShoppingBag,
  RotateCcw,
  Wrench,
  Package,
  Receipt
} from 'lucide-react';
import { PesoIcon } from '@/components/icons/peso-icon';
import type { DbTransaction, ThermalReceiptData } from '@/lib/types/transaction';
import { mapDbTransactionToThermalReceipt } from '@/lib/pos/contracts';
import { calculateWarrantyStatus, STORE_WARRANTY_DAYS } from '@/lib/staff/warranty';
import { WarrantyBadge } from './warranty-badge';
import { ThermalReceiptModal } from '@/components/pos/thermal-receipt-modal';
import { TablePagination, usePagination } from '@/components/common/table-pagination';

export type DateFilterOption = 'all' | 'warranty_eligible' | 'today' | 'last_30_days';

interface PurchaseHistoryViewProps {
  readonly initialTransactions: DbTransaction[];
}

export function PurchaseHistoryView({ initialTransactions }: PurchaseHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeReceiptForPrint, setActiveReceiptForPrint] = useState<ThermalReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Toggle row accordion
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Open receipt preview modal
  const handleReprintReceipt = (tx: DbTransaction) => {
    const receiptData = mapDbTransactionToThermalReceipt(tx);
    setActiveReceiptForPrint(receiptData);
    setIsReceiptModalOpen(true);
  };

  const [now] = useState(() => new Date());

  // Filter transactions based on search query and date filter (all client transactions are cash)
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const nowTime = now.getTime();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const thirtyDaysAgo = nowTime - 30 * 86_400_000;
    const sevenDaysAgo = nowTime - STORE_WARRANTY_DAYS * 86_400_000;

    return initialTransactions.filter((tx) => {
      // Date filter evaluation
      const txTime = tx.created_at ? new Date(tx.created_at).getTime() : 0;

      if (dateFilter === 'warranty_eligible' && txTime < sevenDaysAgo) {
        return false;
      }
      if (dateFilter === 'today' && txTime < startOfToday) {
        return false;
      }
      if (dateFilter === 'last_30_days' && txTime < thirtyDaysAgo) {
        return false;
      }

      // Search query (receipt number, cashier name, item sku, or item name)
      if (q) {
        const matchesReceipt = tx.receipt_number?.toLowerCase().includes(q);
        const matchesCashier = tx.cashier_name?.toLowerCase().includes(q);
        const matchesItems = (tx.items || []).some(
          (item) =>
            item.item_name?.toLowerCase().includes(q) ||
            item.item_sku_or_code?.toLowerCase().includes(q)
        );

        if (!matchesReceipt && !matchesCashier && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [initialTransactions, searchQuery, dateFilter, now]);

  // Aggregate summary statistics
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let warrantyEligibleCount = 0;

    filteredTransactions.forEach((tx) => {
      totalRevenue += Number(tx.total_due) || 0;
      const status = calculateWarrantyStatus(tx.created_at || '', now);
      if (status.isValid) warrantyEligibleCount++;
    });

    return {
      totalCount: filteredTransactions.length,
      totalRevenue,
      warrantyEligibleCount
    };
  }, [filteredTransactions, now]);

  const pagination = usePagination(filteredTransactions, 10);
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [searchQuery, dateFilter, resetPage]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar (Filters placed beside search bar to save vertical space) */}
      <div className="bg-bg-surface border border-border rounded-xl p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
        {/* Search Box */}
        <div className="relative flex-1 min-w-70">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Receipt # (e.g. TX-1041), Cashier, or SKU..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-focus"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs cursor-pointer"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Date / Warranty Filter Pills Beside Search Bar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs shrink-0">
          <span className="text-text-muted flex items-center gap-1 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>

          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-primary text-text-light shadow-xs'
                : 'bg-bg-base text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            All Dates
          </button>

          <button
            type="button"
            onClick={() => setDateFilter('warranty_eligible')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              dateFilter === 'warranty_eligible'
                ? 'bg-success text-text-light shadow-xs'
                : 'bg-bg-base text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Warranty Eligible (≤ 7 Days)
          </button>

          <button
            type="button"
            onClick={() => setDateFilter('today')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-primary text-text-light shadow-xs'
                : 'bg-bg-base text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Today
          </button>

          <button
            type="button"
            onClick={() => setDateFilter('last_30_days')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              dateFilter === 'last_30_days'
                ? 'bg-primary text-text-light shadow-xs'
                : 'bg-bg-base text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            Past 30 Days
          </button>

          {(searchQuery || dateFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDateFilter('all');
              }}
              className="ml-1 text-xs text-text-muted hover:text-danger flex items-center gap-1 cursor-pointer font-medium"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards (Wider and bigger, positioned below search bar) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Matching Sales */}
        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Matching Sales
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bg-muted text-text-secondary border border-border-subtle">
              Transactions
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
              {summary.totalCount.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-text-secondary mt-1 flex items-center gap-1">
              <span>{dateFilter === 'all' && !searchQuery ? 'Total recorded sales' : 'Matching filtered sales'}</span>
            </div>
          </div>
        </div>

        {/* Total Volume */}
        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <PesoIcon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Total Volume
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Cash Sales
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-primary">
              ₱{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-semibold text-text-secondary mt-1 flex items-center gap-1">
              <span>Cumulative cash revenue</span>
            </div>
          </div>
        </div>

        {/* In Warranty */}
        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success shrink-0" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                In Warranty
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20">
              ≤ 7 Days
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-success">
              {summary.warrantyEligibleCount.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-text-secondary mt-1 flex items-center gap-1">
              <span>Eligible for warranty claim</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-muted/30 text-text-secondary font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-3">Receipt #</th>
                  <th className="py-3 px-3">Date &amp; Time</th>
                  <th className="py-3 px-3">Cashier</th>
                  <th className="py-3 px-3">Items Summary</th>
                  <th className="py-3 px-3 text-right">Total Due</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">7-Day Warranty</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {pagination.paginatedItems.map((tx) => {
                  const txId = tx.id || tx.receipt_number;
                  const isExpanded = expandedRows.has(txId);
                  const warranty = calculateWarrantyStatus(tx.created_at || '', now);
                  const itemsCount = tx.items?.length || 0;
                  const partsCount = (tx.items || []).filter((i) => i.item_type === 'part').length;
                  const servicesCount = (tx.items || []).filter((i) => i.item_type === 'service').length;

                  return (
                    <React.Fragment key={txId}>
                      <tr className="hover:bg-bg-hover/50 transition-colors">
                        {/* Accordion Toggle */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRow(txId)}
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-muted cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Receipt Number */}
                        <td className="py-3 px-3 font-mono font-bold text-text-primary">
                          <span className="px-2 py-0.5 rounded bg-bg-muted border border-border text-xs">
                            {tx.receipt_number}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                          {tx.created_at ? new Date(tx.created_at).toLocaleString() : 'N/A'}
                        </td>

                        {/* Cashier */}
                        <td className="py-3 px-3 text-text-primary font-medium">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-text-muted" />
                            <span>{tx.cashier_name}</span>
                          </div>
                        </td>

                        {/* Items Summary */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-text-primary">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                            </span>
                            {partsCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-info-light text-info">
                                <Package className="w-2.5 h-2.5" />
                                {partsCount} parts
                              </span>
                            )}
                            {servicesCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-light text-accent">
                                <Wrench className="w-2.5 h-2.5" />
                                {servicesCount} labor
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Due */}
                        <td className="py-3 px-3 text-right font-bold text-text-primary whitespace-nowrap">
                          ₱{Number(tx.total_due).toFixed(2)}
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-bg-muted text-text-secondary border border-border uppercase">
                            {tx.payment_method}
                          </span>
                        </td>

                        {/* 7-Day Warranty */}
                        <td className="py-3 px-3">
                          <WarrantyBadge warranty={warranty} />
                        </td>

                        {/* Action Button: Reprint Receipt */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleReprintReceipt(tx)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-text-light hover:bg-primary-hover transition-colors shadow-xs cursor-pointer"
                            title="Preview and reprint 80mm thermal receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Reprint</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Line Items Drawer */}
                      {isExpanded && (
                        <tr className="bg-bg-muted/20 border-b border-border">
                          <td colSpan={9} className="p-4 sm:p-5">
                            <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                                <div className="flex items-center gap-2">
                                  <ShoppingBag className="w-4 h-4 text-primary" />
                                  <h4 className="text-xs sm:text-sm font-bold text-text-primary">
                                    Itemized Breakdown for Receipt #{tx.receipt_number}
                                  </h4>
                                </div>
                                <span className="text-xs text-text-muted">
                                  Tier: <span className="uppercase font-semibold text-text-primary">{tx.pricing_mode}</span>
                                </span>
                              </div>

                              {/* Items list */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border-subtle text-text-muted text-[10px] uppercase font-bold">
                                      <th className="py-1 text-left">Type</th>
                                      <th className="py-1 text-left">SKU / Code</th>
                                      <th className="py-1 text-left">Description</th>
                                      <th className="py-1 text-left">Location / Bay</th>
                                      <th className="py-1 text-right">Price</th>
                                      <th className="py-1 text-center">Qty</th>
                                      <th className="py-1 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border-subtle">
                                    {(tx.items || []).map((item, idx) => (
                                      <tr key={item.id || `item-${idx}`} className="text-text-primary">
                                        <td className="py-1.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                            item.item_type === 'part'
                                              ? 'bg-info-light text-info'
                                              : 'bg-accent-light text-accent'
                                          }`}>
                                            {item.item_type}
                                          </span>
                                        </td>
                                        <td className="py-1.5 font-mono text-text-secondary">{item.item_sku_or_code}</td>
                                        <td className="py-1.5 font-medium">{item.item_name}</td>
                                        <td className="py-1.5 text-text-muted">
                                          {item.shelf_location || item.bay || '—'}
                                        </td>
                                        <td className="py-1.5 text-right">₱{Number(item.unit_price).toFixed(2)}</td>
                                        <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                                        <td className="py-1.5 text-right font-bold">₱{Number(item.subtotal).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Totals & Notes footer */}
                              <div className="flex flex-col sm:flex-row justify-between pt-2 border-t border-border-subtle text-xs gap-3">
                                <div>
                                  {tx.technician_notes && (
                                    <div className="text-text-secondary italic">
                                      <span className="font-semibold text-text-primary">Technician Note:</span>{' '}
                                      {tx.technician_notes}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1 text-right">
                                  <div className="text-text-secondary">
                                    Subtotal: ₱{Number(tx.subtotal).toFixed(2)}
                                  </div>
                                  {Number(tx.discount_amount) > 0 && (
                                    <div className="text-danger font-semibold">
                                      Discount ({tx.discount_type || `${Math.round(Number(tx.discount_rate) * 100)}%`}): -₱
                                      {Number(tx.discount_amount).toFixed(2)}
                                    </div>
                                  )}
                                  <div className="font-bold text-text-primary text-sm">
                                    Total: ₱{Number(tx.total_due).toFixed(2)}
                                  </div>
                                  <div className="text-text-muted text-[11px]">
                                    Tendered: ₱{Number(tx.cash_tendered).toFixed(2)} | Change: ₱
                                    {Number(tx.change_due).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <ShoppingBag className="w-12 h-12 text-text-muted/40 mb-3" />
            <h3 className="text-base font-bold text-text-primary">No transactions found</h3>
            <p className="text-xs sm:text-sm text-text-secondary max-w-sm mt-1">
              {searchQuery || dateFilter !== 'all'
                ? 'No transactions matched your current search filters. Try adjusting your query or resetting filters.'
                : 'No sales transactions recorded yet. Sales completed at the Fast-Lane POS terminal will appear here.'}
            </p>
            {(searchQuery || dateFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('all');
                }}
                className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-secondary text-text-primary hover:bg-secondary-hover transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          itemName="transactions"
        />
      </div>

      {/* Printable Thermal Receipt Modal for Reprinting */}
      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setActiveReceiptForPrint(null);
        }}
        receiptData={activeReceiptForPrint}
      />
    </div>
  );
}
