'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { Printer, X, Search, AlertCircle } from 'lucide-react';
import type { ThermalReceiptData, ThermalRollWidth } from '@/lib/types/transaction';
import { getThermalReceiptByReceiptAction } from '@/lib/pos/transaction-actions';

interface ThermalReceiptModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly receiptData?: ThermalReceiptData | null;
  readonly initialRollWidth?: ThermalRollWidth;
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  receiptData: initialReceiptData,
  initialRollWidth = '80mm'
}: ThermalReceiptModalProps) {
  const [rollWidth, setRollWidth] = useState<ThermalRollWidth>(initialRollWidth);
  const [activeReceipt, setActiveReceipt] = useState<ThermalReceiptData | null>(initialReceiptData || null);
  const [prevInitialReceiptData, setPrevInitialReceiptData] = useState(initialReceiptData);
  const [lookupQuery, setLookupQuery] = useState('');
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const titleId = useId();

  // Sync active receipt whenever initialReceiptData changes during render
  if (initialReceiptData !== prevInitialReceiptData) {
    setPrevInitialReceiptData(initialReceiptData);
    if (initialReceiptData) {
      setActiveReceipt(initialReceiptData);
      setLookupError(null);
    }
  }

  // Keyboard shortcut listener for Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  const handleLookup = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = lookupQuery.trim();
    if (!query) return;

    setIsLoadingLookup(true);
    setLookupError(null);

    try {
      const found = await getThermalReceiptByReceiptAction(query);
      if (found) {
        setActiveReceipt(found);
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

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bg-base/80 backdrop-blur-xs animate-fadeIn print:p-0 print:bg-transparent border-0 outline-none w-full h-full max-w-none max-h-none m-0"
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
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
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
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
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
              className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
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
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-text-primary hover:bg-secondary-hover disabled:opacity-50 transition-colors"
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
              className={`thermal-receipt-paper bg-bg-surface text-text-primary border border-dashed border-border rounded-xs p-4 sm:p-5 font-mono shadow-xs transition-all duration-150 print:border-none print:shadow-none print:p-0 print:w-full print:text-black print:bg-white ${
                rollWidth === '58mm'
                  ? 'w-67.5 max-w-67.5 text-[11px] leading-tight'
                  : 'w-87.5 max-w-87.5 text-xs leading-normal'
              }`}
            >
              {/* Receipt Header */}
              <div className="text-center space-y-0.5 pb-3">
                <div className="text-sm sm:text-base font-black tracking-wider uppercase text-text-primary print:text-black">
                  SWIFT MOTO SERVICE
                </div>
                <div className="text-[10px] text-text-secondary print:text-black">
                  104 Rizal Ave, Motor City
                </div>
                <div className="text-[10px] text-text-secondary print:text-black">
                  TIN: 409-281-992-000
                </div>
                <div className="text-[10px] text-text-secondary print:text-black">
                  Tel: (02) 8921-4450
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
                          <div className="font-medium text-text-primary print:text-black truncate max-w-42.5">
                            {item.name}
                          </div>
                          {item.itemType === 'part' && item.shelfLocation && (
                            <div className="text-[9px] text-text-muted print:text-black/80">
                              Loc: {item.shelfLocation}
                            </div>
                          )}
                          {item.itemType === 'service' && (
                            <div className="text-[9px] text-text-muted print:text-black/80">
                              {item.bay ? `${item.bay} • ` : ''}
                              {item.duration ? `${item.duration}` : 'Labor'}
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
                <div>Parts warranty valid for 7 days with receipt.</div>
                <div className="font-bold tracking-wider">*** CUSTOMER COPY ***</div>

                {/* Simulated Barcode */}
                <div className="pt-2 flex flex-col items-center justify-center">
                  <div className="h-7 w-40 flex items-center justify-center gap-0.5 opacity-80 print:opacity-100">
                    {Array.from({ length: 32 }).map((_, i) => {
                      let barWidth = 'w-px';
                      if (i % 3 === 0) {
                        barWidth = 'w-1';
                      } else if (i % 2 === 0) {
                        barWidth = 'w-0.5';
                      }
                      return (
                        <div
                          key={i}
                          className={`h-full bg-text-primary print:bg-black ${barWidth}`}
                        />
                      );
                    })}
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
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-text-primary hover:bg-secondary-hover transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!activeReceipt}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-text-light hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
