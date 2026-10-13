'use server';

import type { MotorcycleModelRecord } from '../types/product.ts';
import { MOCK_MOTORCYCLE_MODEL_RECORDS, MOCK_COMPATIBILITY_RULES } from '../mock-data/motorcycles.ts';
import { MOCK_PRODUCTS } from '../mock-data/products.ts';
import {
  type MotoMatcherMatrixResult,
  type MotoMatcherMatrixPart,
  MotoMatcherMatrixPayloadSchema,
  calculateUpsellDelta,
} from '../types/motomatcher.ts';

/**
 * Server action to retrieve all motorcycle models from Supabase PostgreSQL,
 * sorted by make and model. Falls back to canonical baseline mock records
 * if the database is offline or unmigrated.
 */
export async function getMotorcycleModelsAction(): Promise<MotorcycleModelRecord[]> {
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

/**
 * Deterministic pseudo-UUID generator for fallback mock records.
 */
function createMockUuid(sku: string): string {
  const sanitized = sku.toLowerCase().replace(/[^a-z0-9]/g, '');
  const padded = (sanitized + '000000000000').slice(0, 12);
  return `00000000-0000-4000-8000-${padded}`;
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

  // Find target motorcycle model
  const targetModel = MOCK_MOTORCYCLE_MODEL_RECORDS.find(
    (m) =>
      m.id === modelId ||
      `${m.make} ${m.model}`.toLowerCase() === modelId.toLowerCase() ||
      m.model.toLowerCase() === modelId.toLowerCase()
  );

  if (!targetModel) {
    return { oem_parts: [], aftermarket_parts: [] };
  }

  const modelFullName = `${targetModel.make} ${targetModel.model}`;
  const cleanCategory = category && category.trim() !== '' ? category.trim().toLowerCase() : null;
  const cleanSearch = search && search.trim() !== '' ? search.trim().toLowerCase() : null;

  // Build model compatibility rules map
  const rulesMap = new Map<string, { yearRange?: string; notes?: string }>();
  for (const rule of MOCK_COMPATIBILITY_RULES) {
    if (
      rule.model === modelFullName ||
      rule.model === targetModel.model ||
      rule.model === 'Universal'
    ) {
      rulesMap.set(rule.sku, { yearRange: rule.yearRange, notes: rule.notes });
    }
  }

  // Find matching products
  const matchedParts: Array<{
    part: MotoMatcherMatrixPart;
    isOem: boolean;
  }> = [];

  for (const prod of MOCK_PRODUCTS) {
    const isModelMatch =
      prod.model === modelFullName ||
      prod.model === targetModel.model ||
      rulesMap.has(prod.sku);

    const isUniversal =
      prod.model === 'Universal' ||
      MOCK_COMPATIBILITY_RULES.some((r) => r.sku === prod.sku && r.model === 'Universal');

    if (!isModelMatch && !isUniversal) {
      continue;
    }

    // Category filtering
    if (cleanCategory && prod.category.toLowerCase() !== cleanCategory) {
      continue;
    }

    const rule = rulesMap.get(prod.sku);
    const fitmentNotes = rule?.notes ?? prod.description ?? null;
    const yearRange = rule?.yearRange ?? null;

    // Search keyword filtering
    if (cleanSearch) {
      const matchSku = prod.sku.toLowerCase().includes(cleanSearch);
      const matchName = prod.name.toLowerCase().includes(cleanSearch);
      const matchBrand = prod.brand.toLowerCase().includes(cleanSearch);
      const matchNotes = fitmentNotes?.toLowerCase().includes(cleanSearch) ?? false;

      if (!matchSku && !matchName && !matchBrand && !matchNotes) {
        continue;
      }
    }

    const isOem = prod.oem && !isUniversal;
    const fitmentType = isOem ? 'oem' : isUniversal ? 'universal' : 'aftermarket';

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

    matchedParts.push({ part: matrixPart, isOem });
  }

  // Partition OEM and Aftermarket/Universal parts
  const oemParts = matchedParts.filter((p) => p.isOem).map((p) => p.part);
  const aftermarketParts = matchedParts.filter((p) => !p.isOem).map((p) => p.part);

  // Calculate upsell price delta against benchmark OEM part in same category
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

  // Sort parts
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
export async function getFitmentMatrixAction(
  modelId: string,
  category?: string | null,
  search?: string | null
): Promise<MotoMatcherMatrixResult> {
  if (!modelId) {
    return { oem_parts: [], aftermarket_parts: [] };
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
        return parsed.data;
      }
      console.warn('[MotoMatcher] RPC schema parsing warning, falling back to mock:', parsed.error);
    } else if (error) {
      console.warn('[MotoMatcher] get_moto_matcher_matrix RPC error, falling back:', error.message);
    }
  } catch (err) {
    console.warn('[MotoMatcher] RPC invocation error, falling back to mock engine:', err);
  }

  // Graceful offline mock fallback
  return executeMockMotoMatcherMatrix(modelId, category, search);
}
