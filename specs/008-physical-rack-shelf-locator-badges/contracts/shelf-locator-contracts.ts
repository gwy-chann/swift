/**
 * TypeScript Contracts for Shelf Locator Mapping & Navigation Badges (SIAA-14)
 */

export interface ParsedShelfLocation {
  /**
   * True if location string represents a valid physical assignment.
   */
  isAssigned: boolean;

  /**
   * Zone, aisle, or rack descriptor (e.g. "Rack A-01", "Aisle 1", "Tire Rack 2").
   */
  zoneOrRack: string;

  /**
   * Shelf level or bin descriptor (e.g. "Shelf 2", "Floor").
   */
  shelfOrBin?: string;

  /**
   * Formatted display label (e.g. "Rack A-01 / Shelf 2" or "Unassigned Bay").
   */
  formatted: string;
}

export interface ShelfLocationTagProps {
  /**
   * Raw location string from product record (e.g. "Rack A-01 / Shelf 2" or "").
   */
  location?: string | null;

  /**
   * Optional custom class name overrides.
   */
  className?: string;

  /**
   * Optional flag to show or hide the location/alert icon (default: true).
   */
  showIcon?: boolean;
}

/**
 * Pure parser contract for converting raw location strings into structured domain objects.
 */
export type ParseShelfLocationFn = (location?: string | null) => ParsedShelfLocation;
