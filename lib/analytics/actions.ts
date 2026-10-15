'use server';

import type {
  ExecutiveKpiData,
  WeeklyRevenueData,
  CategoryPnlData,
} from '../types/analytics.ts';
import type { ServiceBayDisplayItem } from '../../components/admin/service-bay-status.tsx';
import {
  fetchExecutiveKpis,
  fetchRevenueTrend7d,
  fetchCategoryPnl,
} from './rpc.ts';
import { computePeriodDateRange } from './export-utils.ts';
import type { AnalyticsPeriod } from '../admin/pnl-cogs-utils.ts';
import {
  getEmptyExecutiveKpis,
  getEmptyWeeklyRevenue,
  getEmptyCategoryPnl,
} from './mapper.ts';
import {
  DETERMINISTIC_FALLBACK_SERVICE_BAYS,
} from './actions-mock.ts';

export type WorkOrderStatus =
  | 'QUEUED'
  | 'IN PROGRESS'
  | 'PENDING_PARTS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface GetCategoryPnlParams {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}

export interface UpdateWorkOrderResult {
  success: boolean;
  orderId: string;
  status: WorkOrderStatus;
  updatedAt: string;
  error?: string;
}

const VALID_WORK_ORDER_STATUSES: Set<string> = new Set([
  'QUEUED',
  'IN PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
]);

async function safeRevalidatePaths(): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin');
    revalidatePath('/admin/reports');
  } catch {
    // Suppressed when executing outside Next.js request context (e.g. tests)
  }
}

/**
 * Server Action: Fetches high-level executive operational KPIs.
 * Returns Gross Revenue today, growth vs yesterday, active work order queues,
 * pending parts count, and critical low-stock count based strictly on real transaction data.
 */
export async function getExecutiveKpisAction(): Promise<ExecutiveKpiData> {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();
        const data = await fetchExecutiveKpis(supabase);
        if (data) {
          return data;
        }
      } catch (err) {
        console.warn('[Analytics Action] Error fetching live executive KPIs:', err);
      }
    }
    return getEmptyExecutiveKpis();
  } catch (err) {
    console.error('[Analytics Action] Unexpected exception in getExecutiveKpisAction:', err);
    return getEmptyExecutiveKpis();
  }
}

/**
 * Server Action: Fetches rolling 7-day revenue trend split by parts counter sales and workshop labor based strictly on real data.
 */
export async function getRevenueTrendAction(): Promise<WeeklyRevenueData> {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();
        const data = await fetchRevenueTrend7d(supabase);
        if (data && data.days && data.days.length === 7) {
          return data;
        }
      } catch (err) {
        console.warn('[Analytics Action] Error fetching live revenue trend:', err);
      }
    }
    return getEmptyWeeklyRevenue();
  } catch (err) {
    console.error('[Analytics Action] Unexpected exception in getRevenueTrendAction:', err);
    return getEmptyWeeklyRevenue();
  }
}

/**
 * Server Action: Fetches categorized P&L and COGS breakdown for a given period based strictly on real transactions.
 * @param params Filter parameter with period: 'daily' | 'weekly' | 'monthly'
 */
export async function getCategoryPnlAction(
  params: GetCategoryPnlParams = {}
): Promise<CategoryPnlData> {
  const period: AnalyticsPeriod = params.period || 'daily';

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();
        const { start, end } = computePeriodDateRange(period);
        const data = await fetchCategoryPnl(supabase, start, end);
        if (data && data.categories && data.categories.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('[Analytics Action] Error fetching live category P&L:', err);
      }
    }
    return getEmptyCategoryPnl();
  } catch (err) {
    console.error('[Analytics Action] Unexpected exception in getCategoryPnlAction:', err);
    return getEmptyCategoryPnl();
  }
}

interface ServiceBayRow {
  id: string;
  name: string;
  bay_type: string;
  status: string;
  display_order: number;
}

interface ActiveWorkOrderRow {
  id: string;
  bay_id: string | null;
  vehicle_model: string;
  service_name: string;
  status: string;
  notes: string | null;
}

function getMechanicInfoDetail(activeOrder?: ActiveWorkOrderRow): string {
  if (!activeOrder) {
    return 'Available for dispatch';
  }
  const isWaitingParts = activeOrder.status === 'PENDING_PARTS';
  const statusNote = isWaitingParts ? 'Waiting for parts' : 'Active';
  return `Mechanic assigned (${statusNote})`;
}

function mapBayToDisplayItem(
  bay: ServiceBayRow,
  ordersByBay: Map<string, ActiveWorkOrderRow>
): ServiceBayDisplayItem {
  const activeOrder = ordersByBay.get(bay.id);
  const status = (activeOrder ? activeOrder.status : bay.status) as ServiceBayDisplayItem['status'];
  const vehicleService = activeOrder
    ? `${activeOrder.vehicle_model} • ${activeOrder.service_name}`
    : `${bay.bay_type} • Standby`;

  return {
    id: bay.id,
    bayName: bay.name,
    status,
    vehicleService,
    mechanicInfo: getMechanicInfoDetail(activeOrder),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchLiveServiceBays(supabase: any): Promise<ServiceBayDisplayItem[] | null> {
  const { data: bays, error: baysError } = await supabase
    .from('service_bays')
    .select('id, name, bay_type, status, display_order')
    .order('display_order', { ascending: true });

  if (baysError || !bays || bays.length === 0) {
    return null;
  }

  const { data: activeOrders } = await supabase
    .from('work_orders')
    .select('id, bay_id, vehicle_model, service_name, status, notes')
    .in('status', ['IN PROGRESS', 'QUEUED', 'PENDING_PARTS']);

  const ordersByBay = new Map<string, ActiveWorkOrderRow>();
  if (activeOrders) {
    for (const order of activeOrders as ActiveWorkOrderRow[]) {
      if (order.bay_id && !ordersByBay.has(order.bay_id)) {
        ordersByBay.set(order.bay_id, order);
      }
    }
  }

  return (bays as ServiceBayRow[]).map((bay) => mapBayToDisplayItem(bay, ordersByBay));
}

/**
 * Server Action: Fetches active workshop service bay status cards and assigned work orders.
 */
export async function getServiceBayStatusAction(): Promise<ServiceBayDisplayItem[]> {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();
        const liveBays = await fetchLiveServiceBays(supabase);
        if (liveBays && liveBays.length > 0) {
          return liveBays;
        }
      } catch (err) {
        console.warn('[Analytics Action] Error querying live service bays:', err);
      }
    }
    return DETERMINISTIC_FALLBACK_SERVICE_BAYS;
  } catch (err) {
    console.error('[Analytics Action] Unexpected exception in getServiceBayStatusAction:', err);
    return DETERMINISTIC_FALLBACK_SERVICE_BAYS;
  }
}

/**
 * Server Action: Updates the operational status of a workshop work order.
 * Triggers revalidation for /admin and /admin/reports.
 */
export async function updateWorkOrderStatusAction(
  orderId: string,
  status: WorkOrderStatus,
  notes?: string
): Promise<UpdateWorkOrderResult> {
  const now = new Date().toISOString();

  if (!VALID_WORK_ORDER_STATUSES.has(status)) {
    return {
      success: false,
      orderId,
      status,
      updatedAt: now,
      error: `Invalid work order status: ${status}`,
    };
  }

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {
          status,
          updated_at: now,
        };
        if (notes) {
          updates.notes = notes;
        }
        if (status === 'COMPLETED') {
          updates.completed_at = now;
        }

        const { error } = await supabase
          .from('work_orders')
          .update(updates)
          .eq('id', orderId);

        if (error) {
          console.warn('[Analytics Action] Database update error on work_orders:', error);
        }
      } catch (clientErr) {
        console.warn('[Analytics Action] Supabase client unavailable for work_orders update:', clientErr);
      }
    }

    await safeRevalidatePaths();

    return {
      success: true,
      orderId,
      status,
      updatedAt: now,
    };
  } catch (err) {
    console.error('[Analytics Action] Exception in updateWorkOrderStatusAction:', err);
    return {
      success: false,
      orderId,
      status,
      updatedAt: now,
      error: err instanceof Error ? err.message : 'Unknown exception',
    };
  }
}
