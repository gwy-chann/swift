"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, UserCheck, AlertCircle } from "lucide-react";
import {
  customerIntakeSchema,
  type CustomerIntakeInput,
} from "@/lib/workshop/intake-dispatch-contracts";

export interface CustomerIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (intake: CustomerIntakeInput) => void;
  initialValues?: Partial<CustomerIntakeInput>;
}

export function CustomerIntakeModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
}: Readonly<CustomerIntakeModalProps>) {
  const [customerName, setCustomerName] = useState(initialValues?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(initialValues?.customerPhone || "");
  const [vehicleModel, setVehicleModel] = useState(initialValues?.vehicleModel || "");
  const [plateNumber, setPlateNumber] = useState(initialValues?.plateNumber || "");
  const [complaints, setComplaints] = useState(initialValues?.complaints || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Sync state when modal transitions to open
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setCustomerName(initialValues?.customerName || "");
      setCustomerPhone(initialValues?.customerPhone || "");
      setVehicleModel(initialValues?.vehicleModel || "");
      setPlateNumber(initialValues?.plateNumber || "");
      setComplaints(initialValues?.complaints || "");
      setErrors({});
    }
  }

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, dashes, spaces, and plus
    if (/^[0-9+\-\s]*$/.test(raw)) {
      setCustomerPhone(raw);
      if (errors.customerPhone) {
        setErrors((prev) => ({ ...prev, customerPhone: "" }));
      }
    }
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validation = customerIntakeSchema.safeParse({
        customerName,
        customerPhone,
        vehicleModel,
        plateNumber,
        complaints,
      });

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validation.error.issues) {
          const field = issue.path[0] as string;
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }

      setErrors({});
      onSubmit(validation.data);
    },
    [customerName, customerPhone, vehicleModel, plateNumber, complaints, onSubmit]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intake-modal-title"
    >
      <div className="w-full max-w-lg bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-bg-surface flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="intake-modal-title" className="text-base font-bold text-text-primary">
                Customer & Vehicle Intake
              </h2>
              <p className="text-xs text-text-muted">
                Required for repair and labor workshop service jobs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Customer Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="customerName"
                className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1"
              >
                Customer Full Name <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="customerName"
                  type="text"
                  placeholder="e.g. Juan Dela Cruz"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: "" }));
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-lg bg-bg-surface border text-text-primary placeholder:text-text-muted transition-colors focus:outline-hidden ${
                    errors.customerName
                      ? "border-error focus:ring-1 focus:ring-error"
                      : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                  }`}
                  autoFocus
                />
              </div>
              {errors.customerName && (
                <p className="mt-1 text-[11px] text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.customerName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="customerPhone"
                className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1"
              >
                Phone Number <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="customerPhone"
                  type="tel"
                  placeholder="0917-123-4567"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  className={`w-full px-3 py-2 text-xs rounded-lg bg-bg-surface border text-text-primary placeholder:text-text-muted transition-colors focus:outline-hidden ${
                    errors.customerPhone
                      ? "border-error focus:ring-1 focus:ring-error"
                      : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                  }`}
                />
              </div>
              {errors.customerPhone ? (
                <p className="mt-1 text-[11px] text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.customerPhone}
                </p>
              ) : (
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  Format: 09XX-XXX-XXXX or 11 digits
                </span>
              )}
            </div>
          </div>

          {/* Vehicle Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="vehicleModel"
                className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1"
              >
                Vehicle Make & Model <span className="text-error">*</span>
              </label>
              <input
                id="vehicleModel"
                type="text"
                placeholder="e.g. Yamaha NMAX 155"
                value={vehicleModel}
                onChange={(e) => {
                  setVehicleModel(e.target.value);
                  if (errors.vehicleModel) setErrors((prev) => ({ ...prev, vehicleModel: "" }));
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg bg-bg-surface border text-text-primary placeholder:text-text-muted transition-colors focus:outline-hidden ${
                  errors.vehicleModel
                    ? "border-error focus:ring-1 focus:ring-error"
                    : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                }`}
              />
              {errors.vehicleModel && (
                <p className="mt-1 text-[11px] text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.vehicleModel}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="plateNumber"
                className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1"
              >
                Plate Number / Reg ID <span className="text-error">*</span>
              </label>
              <input
                id="plateNumber"
                type="text"
                placeholder="e.g. 123-NCR or FOR-REG"
                value={plateNumber}
                onChange={(e) => {
                  setPlateNumber(e.target.value.toUpperCase());
                  if (errors.plateNumber) setErrors((prev) => ({ ...prev, plateNumber: "" }));
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg bg-bg-surface border text-text-primary placeholder:text-text-muted uppercase transition-colors focus:outline-hidden ${
                  errors.plateNumber
                    ? "border-error focus:ring-1 focus:ring-error"
                    : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                }`}
              />
              {errors.plateNumber && (
                <p className="mt-1 text-[11px] text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.plateNumber}
                </p>
              )}
            </div>
          </div>

          {/* Customer Complaints & Reason for Service */}
          <div>
            <label
              htmlFor="complaints"
              className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1"
            >
              Customer Complaints & Reason for Service <span className="text-error">*</span>
            </label>
            <textarea
              id="complaints"
              rows={3}
              placeholder="Describe symptoms, requested overhaul, customer complaints, or technician diagnosis..."
              value={complaints}
              onChange={(e) => {
                setComplaints(e.target.value);
                if (errors.complaints) setErrors((prev) => ({ ...prev, complaints: "" }));
              }}
              className={`w-full px-3 py-2 text-xs rounded-lg bg-bg-surface border text-text-primary placeholder:text-text-muted transition-colors resize-none focus:outline-hidden ${
                errors.complaints
                  ? "border-error focus:ring-1 focus:ring-error"
                  : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
              }`}
            />
            {errors.complaints && (
              <p className="mt-1 text-[11px] text-error flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.complaints}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              Back to Cart
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg bg-primary text-text-light hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
            >
              Proceed to Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
