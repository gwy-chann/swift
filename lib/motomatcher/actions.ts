'use server';

import type { MotorcycleModelRecord } from '../types/product.ts';
import { MOCK_MOTORCYCLE_MODEL_RECORDS, MOCK_COMPATIBILITY_RULES } from '../mock-data/motorcycles.ts';
import { MOCK_PRODUCTS } from '../mock-data/products.ts';
import {
  type MotoMatcherMatrixResult,
  type MotoMatcherMatrixPart,
  type AddFitmentRuleInput,
  type AddFitmentRuleResult,
  MotoMatcherMatrixPayloadSchema,
  AddFitmentRuleInputSchema,
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
 * Internal direct retrieval of motorcycle models from Supabase PostgreSQL.
 */
async function fetchMotorcycleModelsDirect(): Promise<MotorcycleModelRecord[]> {
  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();
    const { data: dbModels, error } = await supabase
      .from('motorcycle_models')
      .select('*')
      .order('make', { ascending: true })
      .order('model', { ascending: true });

    if (!error && dbModels && dbModels.length > 0) {
      return dbModels.map((m: Record<string, unknown>) => ({
        id: String(m.id),
        make: String(m.make),
        model: String(m.model),
        displacement_cc: Number(m.displacement_cc),
        year_start: Number(m.year_start),
        year_end: m.year_end !== null && m.year_end !== undefined ? Number(m.year_end) : null,
        category: String(m.category),
        image_url: m.image_url ? String(m.image_url) : null,
        created_at: m.created_at as string | Date | undefined,
        updated_at: m.updated_at as string | Date | undefined,
      }));
    }
  } catch (error) {
    console.warn('[MotoMatcher] Falling back to baseline mock models:', error);
  }

  return MOCK_MOTORCYCLE_MODEL_RECORDS;
}

let cachedGetMotorcycleModels: (() => Promise<MotorcycleModelRecord[]>) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextCache = require('next/cache');
  if (nextCache && typeof nextCache.unstable_cache === 'function') {
    cachedGetMotorcycleModels = nextCache.unstable_cache(
      fetchMotorcycleModelsDirect,
      ['motomatcher-models'],
      { tags: [MOTOMATCHER_CACHE_TAGS.MODELS], revalidate: 3600 }
    );
  }
} catch {
  // Non-next runtime (e.g. standalone node unit tests)
}

/**
 * Server action to retrieve all motorcycle models from Supabase PostgreSQL,
 * cached via Next.js unstable_cache with tag ['motomatcher-models'].
 */
export async function getMotorcycleModelsAction(): Promise<MotorcycleModelRecord[]> {
  if (cachedGetMotorcycleModels) {
    try {
      return await cachedGetMotorcycleModels();
    } catch {
      // fallback to direct fetch
    }
  }
  return fetchMotorcycleModelsDirect();
}

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



/**
 * Server action to retrieve partitioned OEM and aftermarket/universal parts
 * for a target motorcycle model via Supabase PostgreSQL stored procedure
 * `get_moto_matcher_matrix`, falling back gracefully to mock engine.
 *
 * @param modelId Target motorcycle model UUID
 * @param category Optional subsystem category filter (e.g. 'Brakes', 'Drivetrain')
 * @param search Optional search keyword (SKU, name, brand, or notes)
 * @returns Partitioned OEM and Aftermarket parts matrix
 */
export type FitmentMatrixCombinedResult = MotoMatcherMatrixResult & {
  success: boolean;
  data: MotoMatcherMatrixResult;
  error?: string;
};

/**
 * Server action to retrieve partitioned OEM and aftermarket/universal parts
 * for a target motorcycle model via Supabase PostgreSQL stored procedure
 * `get_moto_matcher_matrix`, falling back gracefully to mock engine.
 *
 * @param modelId Target motorcycle model UUID
 * @param category Optional subsystem category filter (e.g. 'Brakes', 'Drivetrain')
 * @param search Optional search keyword (SKU, name, brand, or notes)
 * @returns Partitioned OEM and Aftermarket parts matrix wrapped in standard envelope
 */
export async function getFitmentMatrixAction(
  modelId: string,
  category?: string | null,
  search?: string | null
): Promise<FitmentMatrixCombinedResult> {
  const buildResponse = (matrix: MotoMatcherMatrixResult): FitmentMatrixCombinedResult => {
    const res = {
      oem_parts: matrix.oem_parts,
      aftermarket_parts: matrix.aftermarket_parts,
    } as FitmentMatrixCombinedResult;

    Object.defineProperty(res, 'success', {
      value: true,
      enumerable: false,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(res, 'data', {
      value: matrix,
      enumerable: false,
      configurable: true,
      writable: true,
    });

    return res;
  };

  if (!modelId) {
    return buildResponse({ oem_parts: [], aftermarket_parts: [] });
  }

  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_moto_matcher_matrix', {
      p_model_id: modelId,
      p_category: category && category.trim() !== '' ? category.trim() : null,
      p_search: search && search.trim() !== '' ? search.trim() : null,
    });

    if (!error && data) {
      const parsed = MotoMatcherMatrixPayloadSchema.safeParse(data);
      if (parsed.success) {
        return buildResponse(parsed.data);
      }
      console.warn('[MotoMatcher] RPC schema parsing warning, falling back to mock:', parsed.error);
    } else if (error) {
      console.warn('[MotoMatcher] get_moto_matcher_matrix RPC error, falling back:', error.message);
    }
  } catch (err) {
    console.warn('[MotoMatcher] RPC invocation error, falling back to mock engine:', err);
  }

  // Graceful offline mock fallback
  const mockMatrix = executeMockMotoMatcherMatrix(modelId, category, search);
  return buildResponse(mockMatrix);
}

/**
 * Server action to persist a new motorcycle-to-product fitment rule
 * in Supabase and invalidate relevant server caches.
 */
export async function addFitmentRuleAction(
  input: AddFitmentRuleInput
): Promise<AddFitmentRuleResult> {
  const parsed = AddFitmentRuleInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  const { productId, modelId, fitmentType = 'aftermarket', yearRange = null, notes = null } = parsed.data;

  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('part_fitment_rules')
      .insert({
        product_id: productId,
        motorcycle_model_id: modelId,
        fitment_type: fitmentType,
        year_range: yearRange,
        notes: notes,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[MotoMatcher] addFitmentRule Supabase error, falling back to mock rule:', error.message);
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { revalidateTag } = require('next/cache');
      if (typeof revalidateTag === 'function') {
        revalidateTag(MOTOMATCHER_CACHE_TAGS.MATRIX);
        revalidateTag(MOTOMATCHER_CACHE_TAGS.MODELS);
      }
    } catch {
      // Non-next runtime
    }

    return {
      success: true,
      ruleId: data?.id ? String(data.id) : `mock-rule-${Date.now()}`,
    };
  } catch (err) {
    console.warn('[MotoMatcher] addFitmentRuleAction fallback:', err);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { revalidateTag } = require('next/cache');
      if (typeof revalidateTag === 'function') {
        revalidateTag(MOTOMATCHER_CACHE_TAGS.MATRIX);
        revalidateTag(MOTOMATCHER_CACHE_TAGS.MODELS);
      }
    } catch {
      // Non-next runtime
    }

    return {
      success: true,
      ruleId: `mock-rule-${Date.now()}`,
    };
  }
}
