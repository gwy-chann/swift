import { z } from "zod";
import type { Product, MotorcycleModelRecord } from "@/lib/types/product";
import type { ComparisonPartItem } from "@/lib/motomatcher/comparison-matrix-contracts";

/**
 * Subsystem Category schema & type
 */
export const SubsystemCategoryDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  shortLabel: z.string().optional(),
  description: z.string().optional(),
  aliases: z.array(z.string()),
});

export type SubsystemCategoryDefinition = z.infer<typeof SubsystemCategoryDefinitionSchema>;

/**
 * Filter Options schema
 */
export const MotoMatcherFilterOptionsSchema = z.object({
  selectedModel: z.custom<MotorcycleModelRecord | null>().nullable(),
  isUniversalPlatform: z.boolean().optional(),
  systemCategory: z.string().default("ALL"),
  includeUniversal: z.boolean().default(true),
});

export type MotoMatcherFilterOptions = z.infer<typeof MotoMatcherFilterOptionsSchema>;

/**
 * Filtered Result Set Contract
 */
export interface MotoMatcherFilteredSet {
  filteredProducts: Product[];
  oemParts: ComparisonPartItem[];
  aftermarketParts: ComparisonPartItem[];
  totalMatches: number;
  oemCount: number;
  aftermarketCount: number;
}

/**
 * Component Props for SubsystemFilterBar
 */
export interface SubsystemFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  includeUniversal: boolean;
  onToggleUniversal: (include: boolean) => void;
  totalMatches?: number;
  oemCount?: number;
  aftermarketCount?: number;
  className?: string;
}
