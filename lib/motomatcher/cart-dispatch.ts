import type { ComparisonPartItem } from './comparison-matrix-contracts.ts';
import type { Product } from '../types/product.ts';
import type { MotoMatcherMatrixPart } from '../types/motomatcher.ts';
import type { PartCartItem } from '../types/cart.ts';
import { cartStore } from '../store/cart-store.ts';

export type CartInsertionStatus =
  | 'ADDED_NEW'
  | 'INCREMENTED_EXISTING'
  | 'OUT_OF_STOCK'
  | 'EXCEEDS_STOCK'
  | 'INVALID_PART';

export interface MotoMatcherCartDispatchRequest {
  /** The comparison matrix part item or raw product to add */
  part: ComparisonPartItem | Product | MotoMatcherMatrixPart;
  /** Quantity to add (default: 1) */
  quantity?: number;
  /** Override manager stock guard */
  overrideStockGuard?: boolean;
  /** Role of active staff user attempting insertion */
  userRole?: string;
}

export interface MotoMatcherCartDispatchResult {
  success: boolean;
  status: CartInsertionStatus;
  message: string;
  currentCartQty: number | null;
  totalCartItemCount: number;
  sku: string;
}

function fromComparisonPart(comp: ComparisonPartItem): Product {
  if (comp.rawProduct && typeof comp.rawProduct === 'object' && 'retail' in comp.rawProduct) {
    return comp.rawProduct as Product;
  }

  return {
    sku: comp.sku,
    name: comp.name,
    brand: comp.brand,
    category: comp.category,
    retail: comp.retailPrice,
    wholesale: comp.wholesalePrice ?? comp.retailPrice,
    cost: comp.wholesalePrice ?? comp.retailPrice,
    stock: comp.stockLevel,
    minThreshold: comp.minThreshold,
    location: comp.shelfLocation || '',
    oem: comp.isOem,
    model: comp.isUniversal ? 'Universal' : 'Dedicated',
    description: comp.upsellBadge ? `Aftermarket Upgrade: ${comp.upsellBadge}` : '',
  };
}

function fromMatrixPart(mat: MotoMatcherMatrixPart): Product {
  const model = mat.is_universal ? 'Universal' : (mat.oem_reference_sku || 'Dedicated');
  const description = mat.upsell_badge
    ? `Aftermarket Upgrade: ${mat.upsell_badge}`
    : (mat.fitment_notes || '');

  return {
    sku: mat.sku,
    name: mat.name,
    brand: mat.brand,
    category: mat.category,
    retail: mat.retail_price,
    wholesale: mat.retail_price,
    cost: mat.retail_price,
    stock: mat.stock_level,
    minThreshold: mat.min_threshold,
    location: mat.shelf_location || '',
    oem: mat.fitment_type === 'oem',
    model,
    description,
  };
}

/**
 * Normalizes any part representation into a standard Product model for cartStore insertion.
 */
export function toProductFromPartInput(
  input: ComparisonPartItem | Product | MotoMatcherMatrixPart
): Product {
  if ('retail' in input && 'wholesale' in input) {
    return input as Product;
  }
  if ('sku' in input && 'stockLevel' in input) {
    return fromComparisonPart(input as ComparisonPartItem);
  }
  if ('retail_price' in input && 'stock_level' in input) {
    return fromMatrixPart(input as MotoMatcherMatrixPart);
  }

  throw new Error(`Unable to normalize part input with sku: ${(input as { sku?: string })?.sku}`);
}

function buildFailureResult(
  reason: 'out_of_stock' | 'exceeds_stock' | undefined,
  product: Product,
  previousQty: number,
  totalCartItemCount: number
): MotoMatcherCartDispatchResult {
  if (reason === 'out_of_stock') {
    return {
      success: false,
      status: 'OUT_OF_STOCK',
      message: `${product.name} is currently out of stock. Check shelf alternatives or restock.`,
      currentCartQty: previousQty > 0 ? previousQty : null,
      totalCartItemCount,
      sku: product.sku,
    };
  }

  if (reason === 'exceeds_stock') {
    return {
      success: false,
      status: 'EXCEEDS_STOCK',
      message: `Cannot add more: Available stock limit reached for ${product.name} (${product.stock} available).`,
      currentCartQty: previousQty,
      totalCartItemCount,
      sku: product.sku,
    };
  }

  return {
    success: false,
    status: 'INVALID_PART',
    message: `Failed to add ${product.name} to POS Cart.`,
    currentCartQty: previousQty > 0 ? previousQty : null,
    totalCartItemCount,
    sku: product.sku,
  };
}

/**
 * Core dispatch engine function for 1-Click Fast-Lane POS Cart Insertion (SIAA-25)
 */
export function dispatchMotoMatcherCartInsertion(
  request: MotoMatcherCartDispatchRequest
): MotoMatcherCartDispatchResult {
  const { part, quantity = 1, overrideStockGuard = false, userRole } = request;

  if (userRole && userRole.toLowerCase().trim() === 'mechanic') {
    return {
      success: false,
      status: 'INVALID_PART',
      message: 'Access restricted: Mechanics cannot add items to the POS cart.',
      currentCartQty: null,
      totalCartItemCount: cartStore.getState().totals.itemCount,
      sku: (part as { sku?: string })?.sku || 'UNKNOWN',
    };
  }

  let product: Product;
  try {
    product = toProductFromPartInput(part);
  } catch {
    return {
      success: false,
      status: 'INVALID_PART',
      message: 'Invalid part data provided for cart insertion.',
      currentCartQty: null,
      totalCartItemCount: cartStore.getState().totals.itemCount,
      sku: (part as { sku?: string })?.sku || 'UNKNOWN',
    };
  }

  const existingItem = cartStore
    .getState()
    .items.find((i) => i.type === 'part' && i.sku === product.sku) as PartCartItem | undefined;

  const previousQty = existingItem ? existingItem.qty : 0;
  const result = cartStore.addItem(product, quantity, overrideStockGuard);
  const updatedState = cartStore.getState();
  const totalCartItemCount = updatedState.totals.itemCount;

  if (!result.success) {
    return buildFailureResult(result.reason, product, previousQty, totalCartItemCount);
  }

  const updatedItem = updatedState.items.find(
    (i) => i.type === 'part' && i.sku === product.sku
  ) as PartCartItem | undefined;

  const currentCartQty = updatedItem ? updatedItem.qty : quantity;
  const isIncremented = previousQty > 0;
  const status: CartInsertionStatus = isIncremented ? 'INCREMENTED_EXISTING' : 'ADDED_NEW';
  const shelfNote = product.location ? ` (Shelf: ${product.location})` : '';
  const message = isIncremented
    ? `Added ${product.name} to POS Cart! (Qty: ${currentCartQty})`
    : `Added ${product.name} to POS Cart!${shelfNote}`;

  return {
    success: true,
    status,
    message,
    currentCartQty,
    totalCartItemCount,
    sku: product.sku,
  };
}
