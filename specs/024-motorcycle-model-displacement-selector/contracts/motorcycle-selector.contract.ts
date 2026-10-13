import { z } from "zod";
import type { MotorcycleModelRecord } from "@/lib/types/product";

/**
 * Filter state contract for the Motorcycle Selector Engine
 */
export const MotorcycleFilterStateSchema = z.object({
  searchQuery: z.string().default(""),
  selectedMake: z.string().default("ALL"),
  selectedCategory: z.string().default("ALL"),
  selectedModelId: z.string().nullable().default(null),
});

export type MotorcycleFilterState = z.infer<typeof MotorcycleFilterStateSchema>;

/**
 * Selection event emitted when a clerk selects a bike or chooses Universal parts
 */
export const MotorcycleSelectionEventSchema = z.object({
  modelId: z.string().nullable(),
  modelName: z.string(),
  make: z.string(),
  displacement_cc: z.number().int().positive().nullable(),
  isUniversal: z.boolean().default(false),
});

export type MotorcycleSelectionEvent = z.infer<typeof MotorcycleSelectionEventSchema>;

/**
 * Pure predicate function to test if a motorcycle model matches search criteria
 */
export function matchesMotorcycleFilter(
  model: MotorcycleModelRecord,
  query: string,
  selectedMake: string = "ALL",
  selectedCategory: string = "ALL"
): boolean {
  // 1. Make filtering
  if (selectedMake !== "ALL" && selectedMake !== "Universal") {
    if (model.make.toLowerCase() !== selectedMake.toLowerCase()) {
      return false;
    }
  }

  // 2. Category filtering
  if (selectedCategory !== "ALL") {
    if (model.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
  }

  // 3. Search query filtering
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const makeMatch = model.make.toLowerCase().includes(trimmed);
  const modelMatch = model.model.toLowerCase().includes(trimmed);
  const fullNameMatch = `${model.make} ${model.model}`.toLowerCase().includes(trimmed);
  const displacementMatch = String(model.displacement_cc).includes(trimmed);
  const categoryMatch = model.category.toLowerCase().includes(trimmed);
  const yearMatch =
    String(model.year_start).includes(trimmed) ||
    (model.year_end ? String(model.year_end).includes(trimmed) : false);

  return makeMatch || modelMatch || fullNameMatch || displacementMatch || categoryMatch || yearMatch;
}
