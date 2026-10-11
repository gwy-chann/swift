export interface PricingRules {
  retailMarkup: number;
  wholesaleMarkup: number;
  aftermarketMarkup: number;
  hourlyLaborRate: number;
}

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

/**
 * Normalizes SKU strings by trimming whitespace and converting to uppercase.
 */
export function normalizeSku(sku: string): string {
  if (!sku) return '';
  return sku.trim().toUpperCase();
}

/**
 * Calculates wholesale and retail prices dynamically based on unit cost and part specification.
 * Wholesale: default +18%
 * Retail (OEM): default +35%
 * Retail (Aftermarket): default +40%
 */
export function calculateMarkupPrices(
  cost: number,
  isOem: boolean,
  rules?: Partial<PricingRules>
): MarkupCalculationResult {
  const numericCost = typeof cost === 'number' && !isNaN(cost) ? cost : 0;
  if (numericCost <= 0) {
    return { wholesale: 0, retail: 0 };
  }

  const wholesaleMarkup = rules?.wholesaleMarkup ?? 18;
  const retailMarkup = isOem
    ? (rules?.retailMarkup ?? 35)
    : (rules?.aftermarketMarkup ?? 40);

  const wholesale = Math.round(numericCost * (1 + wholesaleMarkup / 100) * 100) / 100;
  const retail = Math.round(numericCost * (1 + retailMarkup / 100) * 100) / 100;

  return { wholesale, retail };
}

function validateNumericConstraints(
  input: Partial<ProductRegistrationInput>,
  errors: Record<string, string>
): void {
  if (typeof input.cost !== 'number' || isNaN(input.cost) || input.cost <= 0) {
    errors.cost = 'Unit cost must be greater than ₱0.00.';
  }

  if (
    typeof input.stock !== 'number' ||
    Number.isNaN(input.stock) ||
    input.stock < 0 ||
    !Number.isInteger(input.stock)
  ) {
    errors.stock = 'Initial stock must be a non-negative whole number.';
  }

  if (
    typeof input.minThreshold !== 'number' ||
    Number.isNaN(input.minThreshold) ||
    input.minThreshold < 1 ||
    !Number.isInteger(input.minThreshold)
  ) {
    errors.minThreshold = 'Low stock alert level must be at least 1.';
  }

  if (input.wholesale !== undefined && (typeof input.wholesale !== 'number' || isNaN(input.wholesale) || input.wholesale <= 0)) {
    errors.wholesale = 'Wholesale price must be greater than ₱0.00.';
  }

  if (input.retail !== undefined && (typeof input.retail !== 'number' || isNaN(input.retail) || input.retail <= 0)) {
    errors.retail = 'Retail price must be greater than ₱0.00.';
  }
}

/**
 * Validates product registration input for mandatory fields, numeric constraints,
 * and case-insensitive SKU duplicate collisions against existing catalog SKUs.
 */
export function validateProductRegistration(
  input: Partial<ProductRegistrationInput>,
  existingSkus: string[] = []
): ProductValidationResult {
  const errors: Record<string, string> = {};

  const rawSku = (input.sku || '').trim();
  if (!rawSku) {
    errors.sku = 'SKU / Item Code is required.';
  } else {
    const normalized = normalizeSku(rawSku);
    const hasCollision = existingSkus.some(
      (existing) => normalizeSku(existing) === normalized
    );
    if (hasCollision) {
      errors.sku = `SKU "${normalized}" already exists in the inventory.`;
    }
  }

  if (!input.name || !input.name.trim()) {
    errors.name = 'Product name is required.';
  }

  if (!input.category || !input.category.trim()) {
    errors.category = 'Category is required.';
  }

  if (!input.brand || !input.brand.trim()) {
    errors.brand = 'Brand is required.';
  }

  if (!input.model || !input.model.trim()) {
    errors.model = 'Target motorcycle model is required.';
  }

  if (!input.location || !input.location.trim()) {
    errors.location = 'Shelf location is required.';
  }

  validateNumericConstraints(input, errors);

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
