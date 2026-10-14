import { z } from "zod";
import type { ComparisonPartItem } from "@/lib/motomatcher/comparison-matrix-contracts";

/**
 * Mobile Tab Identifier for Dual-Column Switcher
 */
export const ComparisonMatrixTabSchema = z.enum(["oem", "aftermarket"]);
export type ComparisonMatrixTab = z.infer<typeof ComparisonMatrixTabSchema>;

/**
 * Shelf Location Coordinate Schema
 */
export const ShelfLocationCoordinateSchema = z.object({
  raw: z.string().nullable().optional(),
  formatted: z.string(),
  isAssigned: z.boolean(),
  rack: z.string().optional(),
  shelf: z.string().optional(),
  bin: z.string().optional(),
});

export type ShelfLocationCoordinate = z.infer<typeof ShelfLocationCoordinateSchema>;

/**
 * Extended Comparison Part Item with Shelf Coordinates
 */
export const StaffComparisonPartItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  retailPrice: z.number().nonnegative(),
  wholesalePrice: z.number().nonnegative().optional(),
  stockLevel: z.number().int(),
  minThreshold: z.number().int(),
  isOem: z.boolean(),
  isUniversal: z.boolean().optional(),
  upsellBadge: z.string().optional(),
  shelfLocation: z.string().nullable().optional(),
});

export type StaffComparisonPartItem = z.infer<typeof StaffComparisonPartItemSchema>;

/**
 * Touch-Optimized Comparison Matrix Props
 */
export interface StaffComparisonMatrixProps {
  oemParts: ComparisonPartItem[];
  aftermarketParts: ComparisonPartItem[];
  onAddToCart?: (part: ComparisonPartItem) => void;
  addedSku?: string | null;
  isLoading?: boolean;
  emptyOemMessage?: string;
  emptyAftermarketMessage?: string;
  className?: string;
  touchOptimized?: boolean;
  activeMobileTab?: ComparisonMatrixTab;
  onMobileTabChange?: (tab: ComparisonMatrixTab) => void;
}
