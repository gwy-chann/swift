'use server';

import type {
  AdminStaffShift,
  AttendanceFilterState,
  AttendanceSummaryMetrics,
  DbStaffShift,
  ShiftStatus,
} from '../types/logs.ts';
import {
  computeAttendanceMetrics,
  computeElapsedShiftSeconds,
  filterAdminShifts,
  formatSecondsToDuration,
  formatShiftDate,
  formatWallClockTime,
  isExtendedShift,
} from './attendance-utils.ts';
import { MOCK_ADMIN_SHIFTS } from './mock-data/attendance-mock.ts';

export interface GetAdminStaffAttendanceParams {
  limit?: number;
  offset?: number;
  searchQuery?: string;
  status?: 'all' | ShiftStatus;
  datePreset?: 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom';
  startDate?: string;
  endDate?: string;
  profileId?: string;
}

export interface GetAdminStaffAttendanceResult {
  success: boolean;
  shifts: AdminStaffShift[];
  metrics: AttendanceSummaryMetrics;
  totalCount: number;
  error?: string;
}

const STATUS_LABELS: Record<DbStaffShift['status'], 'On Shift' | 'Break' | 'Completed'> = {
  on_shift: 'On Shift',
  break: 'Break',
  completed: 'Completed',
};

import { MOCK_STAFF_PROFILES } from '../mock-data/users.ts';
import { CANONICAL_DB_PROFILE_IDS } from '../staff/constants.ts';

const STAFF_METADATA_BY_PROFILE: Record<string, { name: string; role: string }> = {
  'c0000000-0000-0000-0000-000000000002': { name: 'Mike Morales', role: 'Cashier' },
  '00000000-0000-0000-0000-000000000002': { name: 'Mike Morales', role: 'Cashier' },
  'd0000000-0000-0000-0000-000000000003': { name: 'Dante Reyes', role: 'Mechanic' },
  '00000000-0000-0000-0000-000000000003': { name: 'Dante Reyes', role: 'Mechanic' },
  '00000000-0000-0000-0000-000000000004': { name: 'Rico Santos', role: 'Inventory Clerk' },
  'd0000000-0000-0000-0000-000000000004': { name: 'Rico Santos', role: 'Inventory Clerk' },
  '1d72a1c9-13c3-4dc1-a035-166299b4d060': { name: 'Elena Vance', role: 'Inventory Clerk' },
  'a0000000-0000-0000-0000-000000000001': { name: 'Carlos Rodriguez', role: 'Admin' },
  '00000000-0000-0000-0000-000000000001': { name: 'Carlos Rodriguez', role: 'Admin' },
  'c9e4d1e8-ac08-4215-852c-e5d8a01ff57c': { name: 'Rene Baterbonia', role: 'Cashier' },
};

// Also enrich with any profiles in MOCK_STAFF_PROFILES
for (const p of MOCK_STAFF_PROFILES) {
  STAFF_METADATA_BY_PROFILE[p.id] = { name: p.name, role: p.roleDisplay };
  const canonical = CANONICAL_DB_PROFILE_IDS[p.id];
  if (canonical) {
    STAFF_METADATA_BY_PROFILE[canonical] = { name: p.name, role: p.roleDisplay };
  }
}

/**
 * Maps a raw DbStaffShift row from PostgreSQL into an enriched AdminStaffShift.
 */
function mapDbRowToAdminShift(row: DbStaffShift): AdminStaffShift {
  const isClockedOut = Boolean(row.clock_out);
  const nowMs = Date.now();
  const rawDurationSeconds = row.duration_seconds ?? computeElapsedShiftSeconds(row.clock_in, row.clock_out, 0, nowMs);
  const { dateStr, isToday } = formatShiftDate(row.clock_in);

  const matchedMeta = row.profile_id ? STAFF_METADATA_BY_PROFILE[row.profile_id] : undefined;
  let resolvedName = row.staff_name || matchedMeta?.name || 'Staff Member';
  if (resolvedName === 'Maria Santos' || resolvedName === 'SWIFT Fast-Lane Cashier') {
    resolvedName = matchedMeta?.name || (resolvedName === 'SWIFT Fast-Lane Cashier' ? 'Mike Morales' : resolvedName);
  }
  const resolvedRole = matchedMeta?.role || 'Staff';

  return {
    id: row.id,
    profileId: row.profile_id,
    staffName: resolvedName,
    staffRole: resolvedRole,
    terminalId: row.terminal_id || 'Terminal #1',
    date: dateStr,
    isToday,
    timeIn: formatWallClockTime(row.clock_in),
    clockInIso: row.clock_in,
    timeOut: isClockedOut ? formatWallClockTime(row.clock_out) : '-- Active Shift --',
    clockOutIso: row.clock_out,
    duration: formatSecondsToDuration(rawDurationSeconds),
    durationSeconds: rawDurationSeconds,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || 'Completed',
    isExtendedShift: isExtendedShift(rawDurationSeconds),
    notes: row.notes,
  };
}

function buildAttendanceFilterState(
  params?: GetAdminStaffAttendanceParams
): AttendanceFilterState {
  return {
    searchQuery: params?.searchQuery || '',
    statusFilter: params?.status || 'all',
    datePreset: params?.datePreset || 'all',
    startDate: params?.startDate,
    endDate: params?.endDate,
    selectedStaffId: params?.profileId,
  };
}

async function fetchShiftsFromSupabase(
  params: GetAdminStaffAttendanceParams | undefined,
  offset: number,
  limit: number
): Promise<{ data: DbStaffShift[]; count: number | null } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null;
  }

  try {
    const { createAdminClient, createClient } = await import('../supabase/server.ts');
    let supabase: ReturnType<typeof createAdminClient>;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = (await createClient()) as unknown as ReturnType<typeof createAdminClient>;
    }

    let query = supabase
      .from('staff_shifts')
      .select('*', { count: 'exact' })
      .order('clock_in', { ascending: false });

    if (params?.profileId && params.profileId !== 'all') {
      query = query.eq('profile_id', params.profileId);
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.warn('[getAdminStaffAttendanceAction] Supabase query error:', error.message);
      return null;
    }

    return {
      data: (data || []) as DbStaffShift[],
      count: count ?? (data || []).length,
    };
  } catch (err) {
    console.warn(
      '[getAdminStaffAttendanceAction] Supabase connection issue, using mock baseline:',
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Server Action: Fetches all staff shifts for the Admin Attendance & History page.
 * Leverages Supabase PostgreSQL staff_shifts table with graceful deterministic fallback.
 */
export async function getAdminStaffAttendanceAction(
  params?: GetAdminStaffAttendanceParams
): Promise<GetAdminStaffAttendanceResult> {
  const limit = params?.limit ?? 100;
  const offset = params?.offset ?? 0;
  const filterState = buildAttendanceFilterState(params);

  // 1. Try Supabase query if credentials exist
  const supabaseResult = await fetchShiftsFromSupabase(params, offset, limit);
  if (supabaseResult) {
    const enrichedShifts = supabaseResult.data.map(mapDbRowToAdminShift);
    const filteredShifts = filterAdminShifts(enrichedShifts, filterState);
    const metrics = computeAttendanceMetrics(enrichedShifts);

    return {
      success: true,
      shifts: filteredShifts,
      metrics,
      totalCount: supabaseResult.count ?? filteredShifts.length,
    };
  }

  // 2. Deterministic Mock Fallback
  const filtered = filterAdminShifts(MOCK_ADMIN_SHIFTS, filterState);
  const metrics = computeAttendanceMetrics(MOCK_ADMIN_SHIFTS);

  return {
    success: true,
    shifts: filtered.slice(offset, offset + limit),
    metrics,
    totalCount: filtered.length,
  };
}
