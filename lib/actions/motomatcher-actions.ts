'use server';

import type { MotorcycleModelRecord } from '../types/product.ts';
import { MOCK_MOTORCYCLE_MODEL_RECORDS } from '../mock-data/motorcycles.ts';

/**
 * Server action to retrieve all motorcycle models from Supabase PostgreSQL,
 * sorted by make and model. Falls back to canonical baseline mock records
 * if the database is offline or unmigrated.
 *
 * @returns {Promise<MotorcycleModelRecord[]>} Array of motorcycle model records
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
