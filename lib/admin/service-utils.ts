/**
 * Workshop labor services utility functions.
 */

const KEYWORD_MAP: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\b(fork|shock|suspension|absorber)\b/i, tag: 'FORK' },
  { pattern: /\b(brake|caliper|pad|rotor|bleeding|disc)\b/i, tag: 'BRK' },
  { pattern: /\b(cvt|variator|pulley|roller|belt)\b/i, tag: 'CVT' },
  { pattern: /\b(tire|tyre|wheel|vulcaniz|bead)\b/i, tag: 'TIRE' },
  { pattern: /\b(chain|sprocket)\b/i, tag: 'CHAIN' },
  { pattern: /\b(clutch|lining)\b/i, tag: 'CLUTCH' },
  { pattern: /\b(carb|carburetor)\b/i, tag: 'CARB' },
  { pattern: /\b(battery|charging|alternator)\b/i, tag: 'BAT' },
  { pattern: /\b(wire|wiring|electrical|light|harness)\b/i, tag: 'WIRE' },
  { pattern: /\b(diagnos|scan|check|inspection|dyno)\b/i, tag: 'DIAG' },
  { pattern: /\b(engine|overhaul|piston|valve|cylinder)\b/i, tag: 'ENG' },
  { pattern: /\b(oil|lube|lubricat|fluid)\b/i, tag: 'OIL' },
  { pattern: /\b(wash|cleaning|detail)\b/i, tag: 'WASH' }
];

function resolveTagFromName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';

  for (const item of KEYWORD_MAP) {
    if (item.pattern.test(trimmed)) {
      return item.tag;
    }
  }

  const words = trimmed
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 0) {
    const first = words[0].toUpperCase();
    return first.length <= 5 ? first : first.substring(0, 4);
  }
  return '';
}

function resolveTaggedCandidate(tag: string, upperCodes: Set<string>): string | null {
  if (!tag) return null;
  for (let i = 1; i <= 99; i++) {
    const candidate = `SRV-${tag}-${String(i).padStart(2, '0')}`;
    if (!upperCodes.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Automatically generates a standardized, unique service code based on
 * the service title keywords and existing catalog codes.
 *
 * Example outputs:
 * - "Brake Pad Replacement" -> "SRV-BRK-02"
 * - "Drive Chain Tensioning" -> "SRV-CHAIN-01"
 * - Generic/unmatched -> "SRV-0078"
 */
export function generateServiceCode(
  name: string,
  existingCodes: string[] = []
): string {
  const tag = resolveTagFromName(name);
  const upperCodes = new Set(existingCodes.map((c) => (c || '').toUpperCase()));

  const candidate = resolveTaggedCandidate(tag, upperCodes);
  if (candidate) {
    return candidate;
  }

  // Fallback sequential numbering
  let seq = 1;
  while (true) {
    const fallback = `SRV-${String(seq).padStart(4, '0')}`;
    if (!upperCodes.has(fallback)) {
      return fallback;
    }
    seq++;
  }
}
