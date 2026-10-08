/**
 * TypeScript Contracts for Shelf Locator Mapping & Badges (SIAA-14)
 */

export interface ParsedShelfLocation {
  /**
   * True if location string is valid non-empty assignment.
   */
  isAssigned: boolean;

  /**
   * Raw or normalized zone/rack prefix (e.g. "Rack A-01", "Aisle 1", "Tire Rack 2").
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
  location?: string | null;
  className?: string;
  showIcon?: boolean;
}
