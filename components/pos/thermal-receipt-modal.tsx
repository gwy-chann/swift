'use client';

import React, { useCallback, useId, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { ThermalReceiptData, ThermalRollWidth } from '@/lib/types/transaction';
import {
  STORE_RECEIPT_CONFIG,
  getThermalRollDimensions
} from '@/lib/pos/thermal-receipt';

export interface ThermalReceiptModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onFinish?: () => void;
  readonly onProceed?: () => void;
  readonly receiptData?: ThermalReceiptData | null;
  /** Roll width is locked strictly to 80mm standard POS format */
  readonly initialRollWidth?: ThermalRollWidth;
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  onFinish,
  onProceed,
  receiptData
}: Readonly<ThermalReceiptModalProps>) {
  const titleId = useId();
  const activeReceipt = receiptData ?? null;

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

  const handleProceed = useCallback(() => {
    if (onProceed) {
      onProceed();
    } else if (onFinish) {
      onFinish();
    } else {
      onClose();
    }
  }, [onProceed, onFinish, onClose]);

  const handlePrintAndFinish = useCallback(() => {
    handlePrint();
    if (onFinish) {
      onFinish();
    } else {
      onClose();
    }
  }, [handlePrint, onFinish, onClose]);

  if (!isOpen) return null;

  // Standardized strictly on 80mm commercial thermal paper
  const rollDim = getThermalRollDimensions('80mm');

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bg-base/80 backdrop-blur-xs animate-fadeIn print:static print:inset-auto print:block print:p-0 print:bg-white print:m-0 print:w-full print:h-auto border-0 outline-none w-full h-full max-w-none max-h-none m-0"
    >
      {/* Modal Container */}
      <div className="relative flex flex-col w-full max-w-lg max-h-[92vh] bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full print:h-auto print:bg-white print:overflow-visible print:block">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-muted/30 print:hidden">
          <h3 id={titleId} className="text-base font-bold text-text-primary">
            Printable Thermal Receipt
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt modal"
            className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Paper Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg-base/50 flex justify-center print:p-0 print:bg-white print:overflow-visible print:block">
          {activeReceipt ? (
            <div
              id="thermal-receipt-print-area"
              className={`thermal-receipt-paper bg-bg-surface text-text-primary border border-dashed border-border rounded-xs p-4 sm:p-5 font-mono shadow-xs transition-all duration-150 print:border-none print:shadow-none print:p-0 print:m-0 print:mx-auto print:w-full print:text-black print:bg-white ${rollDim.containerClass} ${rollDim.fontSizeClass}`}
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
                          <div className="font-medium text-text-primary print:text-black truncate max-w-42.5">
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

              {/* Receipt Footer */}
              <div className="border-t border-dashed border-border pt-3 mt-1 text-center space-y-1 text-[10px] text-text-secondary print:text-black">
                <div>Thank you for your business!</div>
                <div>{STORE_RECEIPT_CONFIG.warrantyNotice}</div>
                <div className="font-bold tracking-wider">{STORE_RECEIPT_CONFIG.customerCopyNotice}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
              <Printer className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-medium">No receipt loaded</p>
              <p className="text-xs text-text-secondary mt-1">
                Select a completed sale or transaction to preview and print.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-bg-muted/30 print:hidden w-full">
          <button
            type="button"
            onClick={handleProceed}
            className="flex-1 flex items-center justify-center px-4 py-2.5 text-xs font-semibold rounded-lg bg-bg-surface border border-border text-text-primary hover:bg-bg-hover transition-colors cursor-pointer text-center"
          >
            Proceed (without printing)
          </button>

          <button
            type="button"
            onClick={handlePrintAndFinish}
            disabled={!activeReceipt}
            className="flex-1 flex items-center justify-center px-4 py-2.5 text-xs font-bold rounded-lg bg-primary text-text-light hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs cursor-pointer text-center"
          >
            Print Receipt &amp; Finish
          </button>
        </div>
      </div>
    </dialog>
  );
}
