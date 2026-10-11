'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { Printer, X, Search, AlertCircle } from 'lucide-react';
import type { ThermalReceiptData, ThermalRollWidth } from '@/lib/types/transaction';
import { getThermalReceiptByReceiptAction } from '@/lib/pos/transaction-actions';
import {
  STORE_RECEIPT_CONFIG,
  getThermalRollDimensions,
  generateReceiptBarcodePattern
} from '@/lib/pos/thermal-receipt';

export interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish?: () => void;
  receiptData?: ThermalReceiptData | null;
  initialRollWidth?: ThermalRollWidth;
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  onFinish,
  receiptData: initialReceiptData,
  initialRollWidth = '80mm'
}: Readonly<ThermalReceiptModalProps>) {
  const [rollWidth, setRollWidth] = useState<ThermalRollWidth>(initialRollWidth);
  const [searchedReceipt, setSearchedReceipt] = useState<ThermalReceiptData | null>(null);
  const [lookupQuery, setLookupQuery] = useState('');
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const titleId = useId();

  const activeReceipt = searchedReceipt ?? initialReceiptData ?? null;

  const handleClose = useCallback(() => {
    setSearchedReceipt(null);
    setLookupError(null);
    setLookupQuery('');
    onClose();
  }, [onClose]);

  // Keyboard shortcut listener for Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  const handlePrintAndFinish = useCallback(() => {
    handlePrint();
    if (onFinish) {
      setSearchedReceipt(null);
      setLookupError(null);
      setLookupQuery('');
      onFinish();
    } else {
      handleClose();
    }
  }, [handlePrint, onFinish, handleClose]);

  const handleLookup = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = lookupQuery.trim();
    if (!query) return;

    setIsLoadingLookup(true);
    setLookupError(null);

    try {
      const found = await getThermalReceiptByReceiptAction(query);
      if (found) {
        setSearchedReceipt(found);
      } else {
        setLookupError(`Receipt "${query}" was not found in transaction logs.`);
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Error retrieving receipt.');
    } finally {
      setIsLoadingLookup(false);
    }
  }, [lookupQuery]);

  if (!isOpen) return null;

  const rollDim = getThermalRollDimensions(rollWidth);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bg-base/80 backdrop-blur-xs animate-fadeIn print:p-0 print:bg-transparent"
    >
      {/* Modal Container */}
      <div className="relative flex flex-col w-full max-w-lg max-h-[92vh] bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-muted/30 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            <h3 id={titleId} className="text-base font-bold text-text-primary">
              Printable Thermal Receipt
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* 58mm / 80mm Roll Width Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-bg-base border border-border text-xs">
              <button
                type="button"
                onClick={() => setRollWidth('58mm')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  rollWidth === '58mm'
                    ? 'bg-primary text-text-light shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                aria-pressed={rollWidth === '58mm'}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setRollWidth('80mm')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  rollWidth === '80mm'
                    ? 'bg-primary text-text-light shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                aria-pressed={rollWidth === '80mm'}
              >
                80mm
              </button>
            </div>

            {/* Modal Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt modal"
              className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Lookup Bar (When modal opened without direct checkout or cashier needs previous receipt) */}
        <div className="px-4 py-2 bg-bg-muted/10 border-b border-border-subtle print:hidden">
          <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Search receipt (e.g. TX-1041)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-focus"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingLookup || !lookupQuery.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-text-primary hover:bg-secondary-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoadingLookup ? 'Loading...' : 'Lookup'}
            </button>
          </form>

          {lookupError && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-danger">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}
        </div>

        {/* Receipt Paper Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg-base/50 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {activeReceipt ? (
            <div
              id="thermal-receipt-print-area"
              className={`thermal-receipt-paper bg-bg-surface text-text-primary border border-dashed border-border rounded-xs p-4 sm:p-5 font-mono shadow-xs transition-all duration-150 print:border-none print:shadow-none print:p-0 print:w-full print:text-black print:bg-white ${rollDim.containerClass} ${rollDim.fontSizeClass}`}
            >
              {/* Receipt Header */}
              <div className="text-center space-y-0.5 pb-3">
                <div className="text-sm sm:text-base font-black tracking-wider uppercase text-text-primary print:text-black">
                  {STORE_RECEIPT_CONFIG.storeName}
                </div>
                <div className="text-[10px] text-text-secondary print:text-black">
                  {STORE_RECEIPT_CONFIG.address}
                </div>
                <div className="text-[10px] text-text-secondary print:text-black">
                  {STORE_RECEIPT_CONFIG.tin}
                </div>
                <div className="text-[10px] text-text-secondary print:text-black">
                  {STORE_RECEIPT_CONFIG.phone}
                </div>
              </div>

              {/* Receipt Metadata */}
              <div className="border-t border-dashed border-border py-2 text-[10px] sm:text-[11px] space-y-0.5 print:text-black">
                <div className="flex justify-between">
                  <span className="text-text-secondary print:text-black">Receipt #:</span>
                  <span className="font-bold text-text-primary print:text-black">{activeReceipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary print:text-black">Date:</span>
                  <span>{new Date(activeReceipt.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary print:text-black">Cashier:</span>
                  <span>{activeReceipt.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary print:text-black">Tier:</span>
                  <span className="uppercase font-semibold">{activeReceipt.pricingMode}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border-t border-b border-dashed border-border py-2 my-1">
                <table className="w-full border-collapse text-[10px] sm:text-[11px]">
                  <thead>
                    <tr className="border-b border-dashed border-border text-text-secondary print:text-black">
                      <th className="text-left font-bold pb-1">ITEM</th>
                      <th className="text-center font-bold pb-1 px-1">QTY</th>
                      <th className="text-right font-bold pb-1">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-border-subtle">
                    {activeReceipt.items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="py-1.5 pr-1">
                          <div className="font-medium text-text-primary print:text-black truncate max-w-[170px]">
                            {item.name}
                          </div>
                          {item.itemType === 'part' && (
                            <div className="text-[9px] text-text-muted print:text-black/80">
                              <span className="font-semibold">SKU:</span> {item.skuOrCode}
                              {item.shelfLocation ? ` • Loc: ${item.shelfLocation}` : ''}
                            </div>
                          )}
                          {item.itemType === 'service' && (
                            <div className="text-[9px] text-text-muted print:text-black/80 space-y-0.5">
                              <div>
                                <span className="font-semibold">Code:</span> {item.skuOrCode}
                                {item.bay ? ` • ${item.bay}` : ''}
                              </div>
                              <div>
                                <span className="font-semibold">Rate:</span> ₱{item.unitPrice.toFixed(2)}
                                {item.duration ? ` • ${item.duration}` : ''}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-1 text-center font-semibold">
                          {item.quantity}
                        </td>
                        <td className="py-1.5 pl-1 text-right font-semibold whitespace-nowrap">
                          ₱{item.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Optional Technician Notes */}
              {activeReceipt.technicianNotes && (
                <div className="border-b border-dashed border-border py-1.5 text-[10px] print:text-black">
                  <div className="font-bold text-text-secondary print:text-black uppercase text-[9px]">
                    Technician Notes:
                  </div>
                  <div className="text-text-primary print:text-black italic mt-0.5">
                    {activeReceipt.technicianNotes}
                  </div>
                </div>
              )}

              {/* Totals Breakdown */}
              <div className="py-2 text-[10px] sm:text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary print:text-black">SUBTOTAL:</span>
                  <span>₱{activeReceipt.subtotal.toFixed(2)}</span>
                </div>

                {activeReceipt.discountAmount > 0 && (
                  <div className="flex justify-between text-danger font-semibold print:text-black">
                    <span>
                      DISCOUNT ({activeReceipt.discountType || `${Math.round(activeReceipt.discountRate * 100)}%`}):
                    </span>
                    <span>-₱{activeReceipt.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs sm:text-sm font-black text-text-primary border-t border-dashed border-border pt-1 print:text-black">
                  <span>TOTAL DUE:</span>
                  <span>₱{activeReceipt.totalDue.toFixed(2)}</span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-text-secondary print:text-black">CASH TENDERED:</span>
                  <span>₱{activeReceipt.cashTendered.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-text-secondary print:text-black">CHANGE:</span>
                  <span className="font-bold text-success print:text-black">
                    ₱{activeReceipt.changeDue.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-[10px] text-text-muted print:text-black">
                  <span>PAYMENT METHOD:</span>
                  <span className="uppercase">{activeReceipt.paymentMethod}</span>
                </div>
              </div>

              {/* Receipt Footer & Barcode */}
              <div className="border-t border-dashed border-border pt-3 mt-1 text-center space-y-1 text-[10px] text-text-secondary print:text-black">
                <div>Thank you for your business!</div>
                <div>{STORE_RECEIPT_CONFIG.warrantyNotice}</div>
                <div className="font-bold tracking-wider">{STORE_RECEIPT_CONFIG.customerCopyNotice}</div>

                {/* Simulated Barcode */}
                <div className="pt-2 flex flex-col items-center justify-center">
                  <div className="h-7 w-40 flex items-center justify-center gap-[2px] opacity-80 print:opacity-100">
                    {generateReceiptBarcodePattern(activeReceipt.receiptNumber).map((bar, i) => (
                      <div
                        key={i}
                        className={`h-full bg-text-primary print:bg-black ${bar.widthClass}`}
                      />
                    ))}
                  </div>
                  <div className="text-[9px] tracking-widest text-text-muted print:text-black mt-0.5">
                    *{activeReceipt.receiptNumber}*
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
              <Printer className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-medium">No receipt loaded</p>
              <p className="text-xs text-text-secondary mt-1">
                Enter a receipt number above to preview and print.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-muted/30 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-text-primary hover:bg-secondary-hover transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!activeReceipt}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-bg-surface border border-border text-text-primary hover:bg-bg-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-text-secondary" />
              <span>Print Only</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAndFinish}
              disabled={!activeReceipt}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-text-light hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt &amp; Finish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
