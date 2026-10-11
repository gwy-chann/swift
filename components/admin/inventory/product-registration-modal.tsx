'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  X,
  DollarSign,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import type { Product } from '@/lib/types/product';
import type { PricingRules } from '@/lib/types/pricing';
import {
  calculateMarkupPrices,
  normalizeSku,
  validateProductRegistration,
  ProductRegistrationInput
} from '@/lib/inventory/product-registration';

export interface ProductRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Product) => void | Promise<{ success: boolean; error?: string } | void>;
  existingSkus: string[];
  pricingRules?: Partial<PricingRules>;
}

const CATEGORIES = [
  'Brakes',
  'Drivetrain',
  'Fluids & Oils',
  'Ignition',
  'Engine & Clutch',
  'Tires'
];

const MOTORCYCLE_MODELS = [
  'Yamaha NMAX 155',
  'Yamaha Aerox 155',
  'Honda Click 125i/150i',
  'Honda ADV 160',
  'Suzuki Raider 150 Fi',
  'Universal Fitment'
];

function getRetailMarkupNote(
  manualOverride: boolean,
  isOem: boolean,
  rules?: Partial<PricingRules>
): string {
  if (manualOverride) {
    return 'Manual override';
  }
  const pct = isOem
    ? (rules?.retailMarkup ?? 35)
    : (rules?.aftermarketMarkup ?? 40);
  return `Auto (+${pct}%)`;
}

function getWholesaleMarkupNote(
  manualOverride: boolean,
  rules?: Partial<PricingRules>
): string {
  if (manualOverride) {
    return 'Manual override';
  }
  const pct = rules?.wholesaleMarkup ?? 18;
  return `Auto (+${pct}%)`;
}

function useProductRegistrationForm({
  isOpen,
  onClose,
  onSubmit,
  existingSkus,
  pricingRules
}: ProductRegistrationModalProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Brakes');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('Yamaha NMAX 155');
  const [location, setLocation] = useState('');
  const [specType, setSpecType] = useState<'aftermarket' | 'oem'>('aftermarket');
  const [stock, setStock] = useState('10');
  const [minThreshold, setMinThreshold] = useState('5');
  const [cost, setCost] = useState('');
  const [wholesale, setWholesale] = useState('');
  const [retail, setRetail] = useState('');

  const [manualWholesaleOverride, setManualWholesaleOverride] = useState(false);
  const [manualRetailOverride, setManualRetailOverride] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const skuInputRef = useRef<HTMLInputElement>(null);

  // Reset and pre-populate defaults when modal opens
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setSku('');
    setName('');
    setCategory('Brakes');
    setBrand('');
    setModel('Yamaha NMAX 155');
    setLocation('');
    setSpecType('aftermarket');
    setStock('10');
    setMinThreshold('5');
    setCost('');
    setWholesale('');
    setRetail('');
    setManualWholesaleOverride(false);
    setManualRetailOverride(false);
    setErrors({});
    setIsSubmitting(false);
  } else if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  // Auto-focus SKU input on modal open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        skuInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Cost Change with Auto-Calculation
  const handleCostChange = (val: string) => {
    setCost(val);
    const numericCost = parseFloat(val);
    if (!isNaN(numericCost) && numericCost > 0) {
      const calculated = calculateMarkupPrices(
        numericCost,
        specType === 'oem',
        pricingRules
      );
      if (!manualWholesaleOverride) {
        setWholesale(calculated.wholesale.toFixed(2));
      }
      if (!manualRetailOverride) {
        setRetail(calculated.retail.toFixed(2));
      }
    } else {
      if (!manualWholesaleOverride) setWholesale('');
      if (!manualRetailOverride) setRetail('');
    }

    if (errors.cost) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.cost;
        return next;
      });
    }
  };

  // Handle Part Specification Change
  const handleSpecTypeChange = (newSpec: 'aftermarket' | 'oem') => {
    setSpecType(newSpec);
    const numericCost = parseFloat(cost);
    if (!isNaN(numericCost) && numericCost > 0 && !manualRetailOverride) {
      const calculated = calculateMarkupPrices(
        numericCost,
        newSpec === 'oem',
        pricingRules
      );
      setRetail(calculated.retail.toFixed(2));
    }
  };

  const handleWholesaleChange = (val: string) => {
    setWholesale(val);
    setManualWholesaleOverride(true);
    if (errors.wholesale) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.wholesale;
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

  const handleSkuChange = (val: string) => {
    setSku(val);
    if (errors.sku) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.sku;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedCost = parseFloat(cost);
    const parsedStock = parseInt(stock, 10);
    const parsedMinThreshold = parseInt(minThreshold, 10);
    const parsedWholesale = parseFloat(wholesale);
    const parsedRetail = parseFloat(retail);

    const payload: Partial<ProductRegistrationInput> = {
      sku: sku.trim(),
      name: name.trim(),
      category: category.trim(),
      brand: brand.trim(),
      model: model.trim(),
      location: location.trim(),
      specType,
      stock: isNaN(parsedStock) ? -1 : parsedStock,
      minThreshold: isNaN(parsedMinThreshold) ? -1 : parsedMinThreshold,
      cost: isNaN(parsedCost) ? 0 : parsedCost,
      wholesale: isNaN(parsedWholesale) ? undefined : parsedWholesale,
      retail: isNaN(parsedRetail) ? undefined : parsedRetail
    };

    const validation = validateProductRegistration(payload, existingSkus);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    const normalizedSkuCode = normalizeSku(sku);
    const newProduct: Product = {
      sku: normalizedSkuCode,
      name: name.trim(),
      category: category.trim(),
      stock: parsedStock,
      minThreshold: parsedMinThreshold,
      location: location.trim(),
      cost: parsedCost,
      wholesale: parsedWholesale || (parsedCost * (1 + (pricingRules?.wholesaleMarkup ?? 18) / 100)),
      retail: parsedRetail || (parsedCost * (1 + (specType === 'oem' ? (pricingRules?.retailMarkup ?? 35) : (pricingRules?.aftermarketMarkup ?? 40)) / 100)),
      oem: specType === 'oem',
      model: model.trim(),
      brand: brand.trim()
    };

    try {
      const res = await onSubmit(newProduct);
      if (res && typeof res === 'object' && res.success === false) {
        if (res.error?.includes('already exists') || res.error?.includes('SKU')) {
          setErrors({ sku: res.error });
        } else {
          setErrors({ general: res.error || 'Failed to register product.' });
        }
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    sku,
    name,
    setName,
    category,
    setCategory,
    brand,
    setBrand,
    model,
    setModel,
    location,
    setLocation,
    specType,
    stock,
    setStock,
    minThreshold,
    setMinThreshold,
    cost,
    wholesale,
    retail,
    manualWholesaleOverride,
    manualRetailOverride,
    errors,
    isSubmitting,
    skuInputRef,
    handleCostChange,
    handleSpecTypeChange,
    handleWholesaleChange,
    handleRetailChange,
    handleSkuChange,
    handleSubmit
  };
}

export function ProductRegistrationModal(props: ProductRegistrationModalProps) {
  const { isOpen, onClose, pricingRules } = props;
  const {
    sku,
    name,
    setName,
    category,
    setCategory,
    brand,
    setBrand,
    model,
    setModel,
    location,
    setLocation,
    specType,
    stock,
    setStock,
    minThreshold,
    setMinThreshold,
    cost,
    wholesale,
    retail,
    manualWholesaleOverride,
    manualRetailOverride,
    errors,
    isSubmitting,
    skuInputRef,
    handleCostChange,
    handleSpecTypeChange,
    handleWholesaleChange,
    handleRetailChange,
    handleSkuChange,
    handleSubmit
  } = useProductRegistrationForm(props);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-registration-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="product-registration-modal-title"
                className="text-base sm:text-lg font-bold text-text-primary"
              >
                Add New Inventory Product
              </h3>
              <p className="text-xs text-text-secondary">
                Master parts catalog entry with automatic wholesale/retail markup calculation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form
          id="productRegistrationForm"
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-5 text-sm"
        >
          {/* General SKU Collision Alert */}
          {errors.sku && (
            <div className="p-3 rounded-lg bg-danger-light border border-danger/30 text-danger flex items-center gap-2.5 text-xs sm:text-sm animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.sku}</span>
            </div>
          )}

          {/* General Submission Error Alert */}
          {errors.general && (
            <div className="p-3 rounded-lg bg-danger-light border border-danger/30 text-danger flex items-center gap-2.5 text-xs sm:text-sm animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Row 1: SKU & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="newProdSku"
                className="block text-xs font-semibold text-text-secondary mb-1.5"
              >
                SKU / Item Code <span className="text-danger">*</span>
              </label>
              <input
                ref={skuInputRef}
                id="newProdSku"
                type="text"
                value={sku}
                onChange={(e) => handleSkuChange(e.target.value)}
                placeholder="e.g. RCB-AER-BP01"
                className={`w-full px-3 py-2 rounded-lg bg-bg-input border ${
                  errors.sku ? 'border-danger' : 'border-border'
                } text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors`}
                required
              />
              <span className="text-[11px] text-text-muted mt-1 block">
                Auto-normalized to uppercase. Unique identifier.
              </span>
            </div>

            <div>
              <label
                htmlFor="newProdCategory"
                className="block text-xs font-semibold text-text-secondary mb-1.5"
              >
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="newProdCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Part Name */}
          <div>
            <label
              htmlFor="newProdName"
              className="block text-xs font-semibold text-text-secondary mb-1.5"
            >
              Product / Part Description <span className="text-danger">*</span>
            </label>
            <input
              id="newProdName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RCB Ceramic Brake Pads Front"
              className={`w-full px-3 py-2 rounded-lg bg-bg-input border ${
                errors.name ? 'border-danger' : 'border-border'
              } text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors`}
              required
            />
            {errors.name && (
              <span className="text-[11px] text-danger mt-1 block">{errors.name}</span>
            )}
          </div>

          {/* Row 3: Brand & Compatible Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="newProdBrand"
                className="block text-xs font-semibold text-text-secondary mb-1.5"
              >
                Brand / Manufacturer <span className="text-danger">*</span>
              </label>
              <input
                id="newProdBrand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Racing Boy"
                className={`w-full px-3 py-2 rounded-lg bg-bg-input border ${
                  errors.brand ? 'border-danger' : 'border-border'
                } text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors`}
                required
              />
              {errors.brand && (
                <span className="text-[11px] text-danger mt-1 block">{errors.brand}</span>
              )}
            </div>

            <div>
              <label
                htmlFor="newProdModel"
                className="block text-xs font-semibold text-text-secondary mb-1.5"
              >
                Target Motorcycle Model <span className="text-danger">*</span>
              </label>
              <select
                id="newProdModel"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
                required
              >
                {MOTORCYCLE_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Shelf Location & Part Spec */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="newProdLocation"
                className="block text-xs font-semibold text-text-secondary mb-1.5"
              >
                Shelf Location <span className="text-danger">*</span>
              </label>
              <input
                id="newProdLocation"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Rack A-02 / Shelf 1"
                className={`w-full px-3 py-2 rounded-lg bg-bg-input border ${
                  errors.location ? 'border-danger' : 'border-border'
                } text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors`}
                required
              />
              {errors.location ? (
                <span className="text-[11px] text-danger mt-1 block">{errors.location}</span>
              ) : (
                <span className="text-[11px] text-text-muted mt-1 block">
                  Warehouse coordinates: Rack, shelf, or bin locator.
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="newProdType"
                className="block text-xs font-semibold text-text-secondary mb-1.5"
              >
                Part Specification <span className="text-danger">*</span>
              </label>
              <select
                id="newProdType"
                value={specType}
                onChange={(e) =>
                  handleSpecTypeChange(e.target.value as 'aftermarket' | 'oem')
                }
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border text-text-primary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="aftermarket">Performance / Aftermarket (+40% Retail)</option>
                <option value="oem">OEM Standard Replacement (+35% Retail)</option>
              </select>
            </div>
          </div>

          {/* Row 5: Initial Stock & Low Stock Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="newProdStock"
                className="block text-xs font-semibold text-text-secondary mb-1.5"
              >
                Initial Stock Qty <span className="text-danger">*</span>
              </label>
              <input
                id="newProdStock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg bg-bg-input border ${
                  errors.stock ? 'border-danger' : 'border-border'
                } text-text-primary focus:outline-none focus:border-primary transition-colors`}
                required
              />
              {errors.stock ? (
                <span className="text-[11px] text-danger mt-1 block">{errors.stock}</span>
              ) : (
                <span className="text-[11px] text-text-muted mt-1 block">
                  If &gt; 0, automatically creates initial inbound stock log.
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="newProdMinThreshold"
                className="block text-xs font-semibold text-text-secondary mb-1.5"
              >
                Low Stock Alert Level <span className="text-danger">*</span>
              </label>
              <input
                id="newProdMinThreshold"
                type="number"
                min="1"
                step="1"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg bg-bg-input border ${
                  errors.minThreshold ? 'border-danger' : 'border-border'
                } text-text-primary focus:outline-none focus:border-primary transition-colors`}
                required
              />
              {errors.minThreshold && (
                <span className="text-[11px] text-danger mt-1 block">
                  {errors.minThreshold}
                </span>
              )}
            </div>
          </div>

          {/* Row 6: Unit Cost, Wholesale Price & Retail Price (3 Columns) */}
          <div className="p-4 rounded-xl bg-bg-muted/40 border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-primary" />
                Pricing & Automated Markups
              </span>
              <span className="text-[11px] text-text-muted">
                Wholesale: +{pricingRules?.wholesaleMarkup ?? 18}% | Retail: +{specType === 'oem' ? (pricingRules?.retailMarkup ?? 35) : (pricingRules?.aftermarketMarkup ?? 40)}% ({specType === 'oem' ? 'OEM' : 'Aftermarket'})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="newProdCost"
                  className="block text-xs font-semibold text-text-secondary mb-1"
                >
                  Unit Cost (₱) <span className="text-danger">*</span>
                </label>
                <input
                  id="newProdCost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="300.00"
                  value={cost}
                  onChange={(e) => handleCostChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg bg-bg-input border ${
                    errors.cost ? 'border-danger' : 'border-border'
                  } text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors`}
                  required
                />
                {errors.cost && (
                  <span className="text-[11px] text-danger mt-1 block">{errors.cost}</span>
                )}
              </div>

              <div>
                <label
                  htmlFor="newProdWholesale"
                  className="block text-xs font-semibold text-text-secondary mb-1"
                >
                  Wholesale Price (₱) <span className="text-danger">*</span>
                </label>
                <input
                  id="newProdWholesale"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="354.00"
                  value={wholesale}
                  onChange={(e) => handleWholesaleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                  required
                />
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  {getWholesaleMarkupNote(manualWholesaleOverride, pricingRules)}
                </span>
              </div>

              <div>
                <label
                  htmlFor="newProdRetail"
                  className="block text-xs font-semibold text-text-secondary mb-1"
                >
                  Retail Price (₱) <span className="text-danger">*</span>
                </label>
                <input
                  id="newProdRetail"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="405.00"
                  value={retail}
                  onChange={(e) => handleRetailChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                  required
                />
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  {getRetailMarkupNote(manualRetailOverride, specType === 'oem', pricingRules)}
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border bg-bg-surface flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-bg-muted hover:bg-bg-hover text-text-secondary border border-border-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="productRegistrationForm"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-primary hover:bg-primary-hover text-text-light shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-text-light border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Register Product</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ProductRegistrationModal as NewProductModal };
