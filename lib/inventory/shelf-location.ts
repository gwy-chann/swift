export interface ParsedShelfLocation {
  isAssigned: boolean;
  zoneOrRack: string;
  shelfOrBin?: string;
  formatted: string;
}

export const UNASSIGNED_BAY_LABEL = 'Unassigned Bay';

/**
 * Checks if a given location string is non-empty and not explicitly unassigned.
 */
export function isShelfLocationAssigned(location?: string | null): boolean {
  if (!location) return false;
  const trimmed = location.trim();
  if (trimmed === '') return false;
  if (trimmed.toLowerCase() === 'unassigned') return false;
  return true;
}

/**
 * Parses and normalizes a warehouse shelf location string into structured parts.
 */
export function parseShelfLocation(location?: string | null): ParsedShelfLocation {
  if (!isShelfLocationAssigned(location)) {
    return {
      isAssigned: false,
      zoneOrRack: '',
      shelfOrBin: undefined,
      formatted: UNASSIGNED_BAY_LABEL
    };
  }

  const raw = location!.trim();
  const parts = raw.split('/').map((s) => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      isAssigned: true,
      zoneOrRack: parts[0],
      shelfOrBin: parts.slice(1).join(' / '),
      formatted: `${parts[0]} / ${parts.slice(1).join(' / ')}`
    };
  }

  return {
    isAssigned: true,
    zoneOrRack: raw,
    shelfOrBin: undefined,
    formatted: raw
  };
}
