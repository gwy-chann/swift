/**
 * Staff Shop Floor Terminal Constants & Default Demo Data
 * Source: SIAA-78, specs/078-staff-kiosk-auth/contracts/kiosk-auth.contract.ts
 */

export const DEFAULT_DEMO_PINS: Record<string, string> = {
  '00000000-0000-0000-0000-000000000002': '1234', // Mike Morales (Cashier)
  '00000000-0000-0000-0000-000000000003': '2222', // Dante Reyes (Mechanic)
  '00000000-0000-0000-0000-000000000004': '3333', // Rico Santos (Inventory Clerk)
  '00000000-0000-0000-0000-000000000001': '8888', // Carlos Rodriguez (Admin)
  'c9e4d1e8-ac08-4215-852c-e5d8a01ff57c': '2008', // Rene Baterbonia (Cashier)
};

export const CANONICAL_DB_PROFILE_IDS: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002': 'c0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003': 'd0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004': 'd0000000-0000-0000-0000-000000000004',
};

export function normalizeProfileId(profileId?: string): string | undefined {
  if (!profileId) return undefined;
  return CANONICAL_DB_PROFILE_IDS[profileId] || profileId;
}

