import type { MotorcycleModelRecord } from '@/lib/types/product';

/**
 * Filter state representing active search and category parameters
 */
export interface MotorcycleFilterState {
  searchQuery: string;
  selectedMake: string;
  selectedCategory: string;
  selectedModelId: string | null;
}

/**
 * Initial baseline filter state
 */
export const DEFAULT_MOTORCYCLE_FILTER_STATE: MotorcycleFilterState = {
  searchQuery: '',
  selectedMake: 'ALL',
  selectedCategory: 'ALL',
  selectedModelId: null,
};

/**
 * Common popular Philippine motorcycle makes for quick-filter tabs/pills
 */
export const POPULAR_PHILIPPINE_MAKES = [
  'ALL',
  'Yamaha',
  'Honda',
  'Suzuki',
  'Kawasaki',
  'Universal'
] as const;

/**
 * Pure predicate testing whether a given motorcycle model matches query and brand filters.
 *
 * @param model - Target motorcycle model record
 * @param query - Free-text search string (e.g. "ADV", "155", "Click", "Yamaha")
 * @param selectedMake - Brand filter ("ALL", "Yamaha", "Honda", etc.)
 * @param selectedCategory - Subsystem or body style category ("ALL", "Scooter", etc.)
 * @returns boolean true if matching
 */
export function matchesMotorcycleFilter(
  model: MotorcycleModelRecord,
  query: string = '',
  selectedMake: string = 'ALL',
  selectedCategory: string = 'ALL'
): boolean {
  // 1. Brand / Make Filter
  if (selectedMake !== 'ALL' && selectedMake !== 'Universal') {
    if (model.make.toLowerCase() !== selectedMake.toLowerCase()) {
      return false;
    }
  }

  // 2. Category Filter
  if (selectedCategory !== 'ALL') {
    if (model.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
  }

  // 3. Text Search Filtering (Make, Model, Displacement, Category, Year)
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  const makeMatch = model.make.toLowerCase().includes(trimmed);
  const modelMatch = model.model.toLowerCase().includes(trimmed);
  const fullNameMatch = `${model.make} ${model.model}`.toLowerCase().includes(trimmed);
  const displacementMatch = String(model.displacement_cc).includes(trimmed);
  const categoryMatch = model.category.toLowerCase().includes(trimmed);
  const yearStartMatch = String(model.year_start).includes(trimmed);
  const yearEndMatch = model.year_end !== null && model.year_end !== undefined
    ? String(model.year_end).includes(trimmed)
    : false;

  return (
    makeMatch ||
    modelMatch ||
    fullNameMatch ||
    displacementMatch ||
    categoryMatch ||
    yearStartMatch ||
    yearEndMatch
  );
}

/**
 * Filters a list of motorcycle models in-memory according to the provided criteria.
 * Executes instantaneously (< 5ms) for responsive typing and instant card rendering.
 */
export function filterMotorcycleModels(
  models: MotorcycleModelRecord[],
  query: string = '',
  selectedMake: string = 'ALL',
  selectedCategory: string = 'ALL'
): MotorcycleModelRecord[] {
  return models.filter((m) => matchesMotorcycleFilter(m, query, selectedMake, selectedCategory));
}
