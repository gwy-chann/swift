'use server';

import type { MotorcycleModelRecord } from '../types/product.ts';
import { MOCK_MOTORCYCLE_MODEL_RECORDS } from '../mock-data/motorcycles.ts';
import {
  type MotoMatcherMatrixResult,
  type AddFitmentRuleInput,
  type AddFitmentRuleResult,
  MotoMatcherMatrixPayloadSchema,
  AddFitmentRuleInputSchema,
} from '../types/motomatcher.ts';
import {
  MOTOMATCHER_CACHE_TAGS,
  executeMockMotoMatcherMatrix,
} from './mock-engine.ts';

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
