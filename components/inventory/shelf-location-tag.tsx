import React from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { parseShelfLocation } from '@/lib/inventory/shelf-location';

export interface ShelfLocationTagProps {
  location?: string | null;
  className?: string;
  showIcon?: boolean;
}

/**
 * Standardized high-contrast warehouse shelf locator badge.
 * Renders `.shelf-location-tag` badge or amber `Unassigned Bay` fallback.
 */
export function ShelfLocationTag({
  location,
  className = '',
  showIcon = true
}: ShelfLocationTagProps) {
  const parsed = parseShelfLocation(location);

  if (!parsed.isAssigned) {
    return (
      <span
        className={`shelf-location-tag shelf-location-unassigned inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-accent-light text-accent border border-accent/30 shadow-2xs select-none ${className}`}
        role="status"
        aria-label="Unassigned storage bay warning"
        title="Unassigned storage bay: Please assign a rack and shelf location"
      >
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />}
        <span>{parsed.formatted}</span>
      </span>
    );
  }

  return (
    <span
      className={`shelf-location-tag inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-secondary-light text-secondary border border-secondary/20 shadow-2xs ${className}`}
      aria-label={`Storage location: ${parsed.formatted}`}
      title={`Storage Bay: ${parsed.formatted}`}
    >
      {showIcon && <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" aria-hidden="true" />}
      <span className="font-medium tracking-tight">{parsed.formatted}</span>
    </span>
  );
}
