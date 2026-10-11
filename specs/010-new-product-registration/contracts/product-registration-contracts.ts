/**
 * TypeScript Contracts for New Product Registration with Automated Markup & Location Assignment (SIAA-16)
 * Location: specs/010-new-product-registration/contracts/product-registration-contracts.ts
 */

import type { Product } from '@/lib/types/product';
import type { PricingRules } from '@/lib/types/pricing';

export interface ProductRegistrationInput {
  sku: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  location: string;
  specType: 'oem' | 'aftermarket';
  stock: number;
  minThreshold: number;
  cost: number;
  wholesale?: number;
  retail?: number;
}

export interface MarkupCalculationResult {
  wholesale: number;
  retail: number;
}

export interface ProductValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface RegisterProductParams {
  product: Product;
  user?: string;
}

export interface ProductRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Product) => void;
  existingSkus: string[];
  pricingRules?: Partial<PricingRules>;
}
