'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Package,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import type { Product, ProductCategory } from '@/lib/types/product';
import type { PricingRules } from '@/lib/types/pricing';
import { calculateMarkupPrices } from '@/lib/inventory/product-registration';
import { formatPeso } from '@/lib/inventory/catalog-filter';

export interface ProductEditModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (updated: {
    sku: string;
    name: string;
    category: ProductCategory | string;
    brand: string;
    model: string;
    cost: number;
    retail: number;
    location: string;
    oem: boolean;
    imageUrl?: string;
    description?: string;
  }) => Promise<{ success: boolean; error?: string } | void>;
  pricingRules?: Partial<PricingRules>;
}

const CATEGORIES: ProductCategory[] = [
  'Brakes',
  'Drivetrain',
  'Fluids & Oils',
  'Ignition',
  'Engine & Clutch',
  'Tires'
];

const COMMON_MOTORCYCLE_MODELS = [
  'Yamaha NMAX 155',
  'Yamaha Aerox 155',
  'Honda Click 125i/150i',
  'Honda ADV 160',
  'Suzuki Raider 150 Fi',
  'Universal Fitment'
];

interface ProductEditFormProps {
  product: Product;
  onClose: () => void;
  onSubmit: ProductEditModalProps['onSubmit'];
  pricingRules?: Partial<PricingRules>;
}

function ProductEditForm({
  product,
  onClose,
  onSubmit,
  pricingRules
}: Readonly<ProductEditFormProps>) {
  const [name, setName] = useState(product.name || '');
  const [category, setCategory] = useState<string>(product.category || 'Brakes');
  const [brand, setBrand] = useState(product.brand || '');
  const [model, setModel] = useState(product.model || 'Universal Fitment');
  const [cost, setCost] = useState(product.cost > 0 ? String(product.cost) : '');
  const [retail, setRetail] = useState(product.retail > 0 ? String(product.retail) : '');
  const [location, setLocation] = useState(product.location || '');
  const [specType, setSpecType] = useState<'oem' | 'aftermarket'>(
    product.oem ? 'oem' : 'aftermarket'
  );
  const [description, setDescription] = useState(product.description || '');
  const [imageUrl, setImageUrl] = useState(product.imageUrl || '');

  const [manualRetailOverride, setManualRetailOverride] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const numericCost = Number.parseFloat(cost);
  const isCostValid = !Number.isNaN(numericCost) && numericCost > 0;

  // Auto-calculated wholesale based on rate markup rules
  const wholesaleMarkupRate = pricingRules?.wholesaleMarkup ?? 18;
  const computedWholesale = isCostValid
    ? Number((numericCost * (1 + wholesaleMarkupRate / 100)).toFixed(2))
    : 0;

  // Auto-suggested retail price based on OEM/Aftermarket rate markup rules
  const retailMarkupRate =
    specType === 'oem'
      ? (pricingRules?.retailMarkup ?? 35)
      : (pricingRules?.aftermarketMarkup ?? 40);
  const suggestedRetail = isCostValid
    ? Number((numericCost * (1 + retailMarkupRate / 100)).toFixed(2))
    : 0;

  const handleCostChange = (val: string) => {
    setCost(val);
    const parsed = Number.parseFloat(val);
    if (!Number.isNaN(parsed) && parsed > 0 && !manualRetailOverride) {
      const calculated = calculateMarkupPrices(
        parsed,
        specType === 'oem',
        pricingRules
      );
      setRetail(calculated.retail.toFixed(2));
    }
    if (errors.cost) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.cost;
        return next;
      });
    }
  };

  const handleRetailChange = (val: string) => {
    setRetail(val);
    setManualRetailOverride(true);
    if (errors.retail) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.retail;
        return next;
      });
    }
  };

  const handleSpecTypeChange = (newSpec: 'oem' | 'aftermarket') => {
    setSpecType(newSpec);
    if (isCostValid && !manualRetailOverride) {
      const calculated = calculateMarkupPrices(
        numericCost,
        newSpec === 'oem',
        pricingRules
      );
      setRetail(calculated.retail.toFixed(2));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required.';
    }

    if (!brand.trim()) {
      newErrors.brand = 'Brand is required.';
    }

    if (Number.isNaN(numericCost) || numericCost <= 0) {
      newErrors.cost = 'Unit cost must be greater than ₱0.00.';
    }

    const parsedRetail = Number.parseFloat(retail);
    if (Number.isNaN(parsedRetail) || parsedRetail <= 0) {
      newErrors.retail = 'Retail price must be greater than ₱0.00.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        sku: product.sku,
        name: name.trim(),
        category,
        brand: brand.trim(),
        model: model.trim() || 'Universal Fitment',
        cost: numericCost,
        retail: Number.parseFloat(retail),
        location: location.trim().toUpperCase(),
        oem: specType === 'oem',
        imageUrl: imageUrl.trim() || undefined,
        description: description.trim() || undefined
      });

      if (result && !result.success && result.error) {
        setServerError(result.error);
      }
    } catch {
      setServerError('An unexpected network error occurred while updating product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Server Error Alert */}
      {serverError && (
        <div className="p-3.5 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Section 1: Read-Only System Invariants */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-bg-muted/40 border border-border-subtle text-xs">
        {/* Immutable SKU */}
        <div>
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
            <Lock className="w-3 h-3 text-text-muted" />
            SKU (Immutable)
          </span>
          <p className="font-mono font-bold text-text-primary mt-1 px-2.5 py-1.5 rounded bg-bg-card border border-border-subtle select-all">
            {product.sku}
          </p>
        </div>

        {/* Read-Only Stock On-Hand */}
        <div>
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-text-muted" />
            Current Stock (Read-Only)
          </span>
          <div className="flex items-center justify-between mt-1 px-2.5 py-1.5 rounded bg-bg-card border border-border-subtle">
            <span className="font-bold text-text-primary">
              {product.stock} units
            </span>
            <span className="text-[10px] text-text-muted italic flex items-center gap-0.5">
              <Info className="w-3 h-3" />
              Adjust in Stock Modal
            </span>
          </div>
        </div>

        {/* Read-Only Min Stock Alert Threshold */}
        <div>
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-text-muted" />
            Alert Level (Managed)
          </span>
          <p className="font-bold text-text-secondary mt-1 px-2.5 py-1.5 rounded bg-bg-card border border-border-subtle">
            {product.minThreshold} units
          </p>
        </div>
      </div>

      {/* Section 2: Core Product Information */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Part Information & Fitment
        </h3>

        {/* Part Name */}
        <div>
          <label
            htmlFor="edit-product-name"
            className="block text-xs font-semibold text-text-primary mb-1"
          >
            Part Name <span className="text-danger">*</span>
          </label>
          <input
            id="edit-product-name"
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.name;
                  return next;
                });
              }
            }}
            placeholder="e.g. Front Disc Brake Pad Set"
            className={`w-full px-3 py-2 text-sm rounded-lg border bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40 ${
              errors.name ? 'border-danger' : 'border-border'
            }`}
          />
          {errors.name && (
            <p className="text-[11px] font-medium text-danger mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Category & Brand */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="edit-product-category"
              className="block text-xs font-semibold text-text-primary mb-1"
            >
              Subsystem Category <span className="text-danger">*</span>
            </label>
            <select
              id="edit-product-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-product-brand"
              className="block text-xs font-semibold text-text-primary mb-1"
            >
              Brand / Manufacturer <span className="text-danger">*</span>
            </label>
            <input
              id="edit-product-brand"
              type="text"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                if (errors.brand) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.brand;
                    return next;
                  });
                }
              }}
              placeholder="e.g. Yamaha Genuine Parts, RCB, Brembo"
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40 ${
                errors.brand ? 'border-danger' : 'border-border'
              }`}
            />
            {errors.brand && (
              <p className="text-[11px] font-medium text-danger mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.brand}
              </p>
            )}
          </div>
        </div>

        {/* Motorcycle Model Compatibility & Quick Picker */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="edit-product-model"
              className="text-xs font-semibold text-text-primary"
            >
              Motorcycle Model Compatibility
            </label>
            <span className="text-[10px] text-text-muted">
              Select model or enter custom fitment
            </span>
          </div>
          <input
            id="edit-product-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Yamaha NMAX 155 / Aerox 155"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40 mb-2"
          />
          <div className="flex flex-wrap gap-1.5">
            {COMMON_MOTORCYCLE_MODELS.map((common) => (
              <button
                key={common}
                type="button"
                onClick={() => setModel(common)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                  model === common
                    ? 'bg-primary text-text-light border-primary'
                    : 'bg-bg-muted hover:bg-bg-hover text-text-secondary border-border-subtle'
                }`}
              >
                {common}
              </button>
            ))}
          </div>
        </div>

        {/* Specification Type: OEM Genuine vs Aftermarket */}
        <div>
          <label
            id="edit-product-oem-label"
            className="block text-xs font-semibold text-text-primary mb-1.5"
          >
            Part Specification (OEM vs Aftermarket)
          </label>
          <div
            role="radiogroup"
            aria-labelledby="edit-product-oem-label"
            className="grid grid-cols-2 gap-3"
          >
            <button
              type="button"
              role="radio"
              aria-checked={specType === 'aftermarket'}
              onClick={() => handleSpecTypeChange('aftermarket')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                specType === 'aftermarket'
                  ? 'border-primary bg-primary/10 shadow-2xs'
                  : 'border-border bg-bg-surface hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">
                  Aftermarket Replacement
                </span>
                {specType === 'aftermarket' && (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Third-party standard replacement (+{pricingRules?.aftermarketMarkup ?? 40}% retail markup)
              </p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={specType === 'oem'}
              onClick={() => handleSpecTypeChange('oem')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                specType === 'oem'
                  ? 'border-primary bg-primary/10 shadow-2xs'
                  : 'border-border bg-bg-surface hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">
                  OEM Genuine Original
                </span>
                {specType === 'oem' && (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Original manufacturer certified part (+{pricingRules?.retailMarkup ?? 35}% retail markup)
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Pricing & Warehouse Shelf Locator */}
      <div className="space-y-3.5 pt-2 border-t border-border-subtle">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <span>₱</span> Pricing & Storage Location
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Unit Cost */}
          <div>
            <label
              htmlFor="edit-product-cost"
              className="block text-xs font-semibold text-text-primary mb-1"
            >
              Unit Supplier Cost (₱) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted">
                ₱
              </span>
              <input
                id="edit-product-cost"
                type="number"
                step="0.01"
                min="0.01"
                value={cost}
                onChange={(e) => handleCostChange(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg border bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-mono ${
                  errors.cost ? 'border-danger' : 'border-border'
                }`}
              />
            </div>
            {errors.cost && (
              <p className="text-[11px] font-medium text-danger mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.cost}
              </p>
            )}
          </div>

          {/* Retail Selling Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="edit-product-retail"
                className="text-xs font-semibold text-text-primary"
              >
                Retail Price (₱) <span className="text-danger">*</span>
              </label>
              {isCostValid && suggestedRetail > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRetail(suggestedRetail.toFixed(2));
                    setManualRetailOverride(false);
                  }}
                  className="text-[10px] text-primary hover:underline cursor-pointer"
                >
                  Use Suggestion
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted">
                ₱
              </span>
              <input
                id="edit-product-retail"
                type="number"
                step="0.01"
                min="0.01"
                value={retail}
                onChange={(e) => handleRetailChange(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg border bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-mono font-bold ${
                  errors.retail ? 'border-danger' : 'border-border'
                }`}
              />
            </div>
            {errors.retail && (
              <p className="text-[11px] font-medium text-danger mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.retail}
              </p>
            )}
          </div>

          {/* Wholesale Price Display (Excluded from manual edit) */}
          <div>
            <span className="block text-xs font-semibold text-text-muted mb-1 flex items-center justify-between">
              <span>Wholesale Price</span>
              <span className="text-[10px] text-text-muted">Auto (+{wholesaleMarkupRate}%)</span>
            </span>
            <div className="px-3 py-2 text-sm rounded-lg border border-border-subtle bg-bg-muted text-text-secondary font-mono font-semibold flex items-center justify-between">
              <span>{formatPeso(computedWholesale)}</span>
              <span className="text-[10px] text-text-muted italic">Managed</span>
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              Governed by /admin/rates pricing rules.
            </p>
          </div>
        </div>

        {/* Shelf Locator Tag */}
        <div>
          <label
            htmlFor="edit-product-location"
            className="block text-xs font-semibold text-text-primary mb-1"
          >
            Physical Shelf / Warehouse Locator
          </label>
          <input
            id="edit-product-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. RACK-A-01, BIN-12"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary uppercase font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Section 4: Optional Metadata (Description & Image URL) */}
      <div className="space-y-3.5 pt-2 border-t border-border-subtle">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Product Description & Imagery
        </h3>

        <div>
          <label
            htmlFor="edit-product-image"
            className="block text-xs font-semibold text-text-primary mb-1"
          >
            Image URL (Optional)
          </label>
          <input
            id="edit-product-image"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/part.jpg"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-mono text-xs"
          />
        </div>

        <div>
          <label
            htmlFor="edit-product-description"
            className="block text-xs font-semibold text-text-primary mb-1"
          >
            Technical Description & Notes (Optional)
          </label>
          <textarea
            id="edit-product-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specifications, compatibility notes, package contents..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Modal Actions Footer */}
      <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-bg-surface hover:bg-bg-hover text-text-secondary transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary-hover text-text-light transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-text-light/30 border-t-text-light rounded-full animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>
    </form>
  );
}

export function ProductEditModal({
  isOpen,
  product,
  onClose,
  onSubmit,
  pricingRules
}: Readonly<ProductEditModalProps>) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-product-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-xl border border-border bg-bg-card shadow-2xl overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-border bg-bg-surface/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="edit-product-modal-title"
                className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2"
              >
                <span>Edit Product Details</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg-muted border border-border text-text-secondary">
                  {product.sku}
                </span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Update catalog metadata, fitment, supplier cost, and retail pricing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delegated Form with product.sku key to guarantee pristine reset */}
        <ProductEditForm
          key={product.sku}
          product={product}
          onClose={onClose}
          onSubmit={onSubmit}
          pricingRules={pricingRules}
        />
      </div>
    </div>
  );
}
