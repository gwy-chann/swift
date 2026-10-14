import type { MotorcycleModelRecord } from '../types/product.ts';
import { MOCK_MOTORCYCLE_MODEL_RECORDS, MOCK_COMPATIBILITY_RULES } from '../mock-data/motorcycles.ts';
import { MOCK_PRODUCTS } from '../mock-data/products.ts';
import {
  type MotoMatcherMatrixResult,
  type MotoMatcherMatrixPart,
  calculateUpsellDelta,
} from '../types/motomatcher.ts';

/**
 * Cache tags used for Next.js unstable_cache and server tag revalidation.
 */
export const MOTOMATCHER_CACHE_TAGS = {
  MODELS: 'motomatcher-models',
  MATRIX: 'motomatcher-matrix',
} as const;

/**
 * Deterministic pseudo-UUID generator for fallback mock records.
 */
function createMockUuid(sku: string): string {
  const sanitized = sku.toLowerCase().replace(/[^a-z0-9]/g, '');
  const padded = (sanitized + '000000000000').slice(0, 12);
  return `00000000-0000-4000-8000-${padded}`;
}

function findTargetMotorcycle(modelId: string): MotorcycleModelRecord | undefined {
  const normalizedId = modelId.toLowerCase();
  return MOCK_MOTORCYCLE_MODEL_RECORDS.find(
    (m) =>
      m.id === modelId ||
      `${m.make} ${m.model}`.toLowerCase() === normalizedId ||
      m.model.toLowerCase() === normalizedId
  );
}

function buildRulesMap(modelFullName: string, modelName: string): Map<string, { yearRange?: string; notes?: string }> {
  const rulesMap = new Map<string, { yearRange?: string; notes?: string }>();
  for (const rule of MOCK_COMPATIBILITY_RULES) {
    if (
      rule.model === modelFullName ||
      rule.model === modelName ||
      rule.model === 'Universal'
    ) {
      rulesMap.set(rule.sku, { yearRange: rule.yearRange, notes: rule.notes });
    }
  }
  return rulesMap;
}

function matchesProductSearch(
  sku: string,
  name: string,
  brand: string,
  notes: string | null,
  search: string | null
): boolean {
  if (!search) return true;
  return (
    sku.toLowerCase().includes(search) ||
    name.toLowerCase().includes(search) ||
    brand.toLowerCase().includes(search) ||
    (notes?.toLowerCase().includes(search) ?? false)
  );
}

function resolveFitmentType(isOem: boolean, isUniversal: boolean): 'oem' | 'universal' | 'aftermarket' {
  if (isOem) {
    return 'oem';
  }
  if (isUniversal) {
    return 'universal';
  }
  return 'aftermarket';
}

function enrichAftermarketUpsells(
  aftermarketParts: MotoMatcherMatrixPart[],
  oemParts: MotoMatcherMatrixPart[]
): void {
  const oemBenchmarkByCategory = new Map<string, MotoMatcherMatrixPart>();
  for (const oem of oemParts) {
    const existing = oemBenchmarkByCategory.get(oem.category);
    if (!existing || oem.retail_price < existing.retail_price) {
      oemBenchmarkByCategory.set(oem.category, oem);
    }
  }

  for (const am of aftermarketParts) {
    const benchmark = oemBenchmarkByCategory.get(am.category);
    if (benchmark && benchmark.retail_price > 0) {
      const delta = calculateUpsellDelta(benchmark.retail_price, am.retail_price);
      if (delta) {
        am.upsell_delta_amount = delta.deltaAmount;
        am.upsell_delta_percent = delta.deltaPercent;
        am.upsell_badge = delta.badge;
        am.oem_reference_sku = benchmark.sku;
      }
    }
  }
}

function mapProductToMatrixPart(
  prod: (typeof MOCK_PRODUCTS)[0],
  rulesMap: Map<string, { yearRange?: string; notes?: string }>,
  modelFullName: string,
  targetModelName: string,
  cleanCategory: string | null,
  cleanSearch: string | null
): { part: MotoMatcherMatrixPart; isOem: boolean } | null {
  const isModelMatch =
    prod.model === modelFullName ||
    prod.model === targetModelName ||
    rulesMap.has(prod.sku);

  const isUniversal =
    prod.model === 'Universal' ||
    MOCK_COMPATIBILITY_RULES.some((r) => r.sku === prod.sku && r.model === 'Universal');

  if (!isModelMatch && !isUniversal) return null;
  if (cleanCategory && prod.category.toLowerCase() !== cleanCategory) return null;

  const rule = rulesMap.get(prod.sku);
  const fitmentNotes = rule?.notes ?? prod.description ?? null;
  const yearRange = rule?.yearRange ?? null;

  if (!matchesProductSearch(prod.sku, prod.name, prod.brand, fitmentNotes, cleanSearch)) {
    return null;
  }

  const isOem = prod.oem && !isUniversal;
  const fitmentType = resolveFitmentType(isOem, isUniversal);

  const matrixPart: MotoMatcherMatrixPart = {
    id: prod.id ?? createMockUuid(prod.sku),
    sku: prod.sku,
    name: prod.name,
    brand: prod.brand,
    category: prod.category,
    retail_price: Number(prod.retail),
    stock_level: Number(prod.stock),
    min_threshold: Number(prod.minThreshold ?? 0),
    shelf_location: prod.location ?? null,
    fitment_type: fitmentType,
    fitment_notes: fitmentNotes,
    year_range: yearRange,
    is_universal: isUniversal,
    upsell_delta_amount: null,
    upsell_delta_percent: null,
    upsell_badge: null,
    oem_reference_sku: null,
  };

  return { part: matrixPart, isOem };
}

/**
 * Pure fallback engine executing MotoMatcher matrix search against baseline mock data.
 * Used when Supabase PostgreSQL is unreachable or in isolated unit tests.
 */
export function executeMockMotoMatcherMatrix(
  modelId: string,
  category?: string | null,
  search?: string | null
): MotoMatcherMatrixResult {
  if (!modelId) {
    return { oem_parts: [], aftermarket_parts: [] };
  }

  const targetModel = findTargetMotorcycle(modelId);
  if (!targetModel) {
    return { oem_parts: [], aftermarket_parts: [] };
  }

  const modelFullName = `${targetModel.make} ${targetModel.model}`;
  const cleanCategory = category && category.trim() !== '' ? category.trim().toLowerCase() : null;
  const cleanSearch = search && search.trim() !== '' ? search.trim().toLowerCase() : null;

  const rulesMap = buildRulesMap(modelFullName, targetModel.model);
  const oemParts: MotoMatcherMatrixPart[] = [];
  const aftermarketParts: MotoMatcherMatrixPart[] = [];

  for (const prod of MOCK_PRODUCTS) {
    const matched = mapProductToMatrixPart(
      prod,
      rulesMap,
      modelFullName,
      targetModel.model,
      cleanCategory,
      cleanSearch
    );
    if (!matched) continue;

    if (matched.isOem) {
      oemParts.push(matched.part);
    } else {
      aftermarketParts.push(matched.part);
    }
  }

  enrichAftermarketUpsells(aftermarketParts, oemParts);

  oemParts.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  aftermarketParts.sort((a, b) => {
    if (a.is_universal !== b.is_universal) {
      return a.is_universal ? 1 : -1;
    }
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  });

  return {
    oem_parts: oemParts,
    aftermarket_parts: aftermarketParts,
  };
}
