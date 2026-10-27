import type { WorkOrderStatus } from '../types/service.ts';
import type { DetailedWorkOrder } from '../types/workshop.ts';
import {
  INITIAL_MOCK_WORK_ORDERS,
  DANTE_REYES_PROFILE_ID,
} from './workshop-mock-data.ts';
import {
  validateWorkOrderStatusTransition,
  calculateRemainingMinutes,
} from '../services/service-bay-mapper.ts';

async function safeRevalidatePaths() {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/staff/work-orders');
    revalidatePath('/admin');
  } catch {
    // Revalidation not active in pure Node.js test runner
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory cache for demo and offline test resilient mode
let inMemoryOrders: DetailedWorkOrder[] = [...INITIAL_MOCK_WORK_ORDERS];

export function appendInMemoryWorkOrder(order: DetailedWorkOrder): void {
  inMemoryOrders = [
    order,
    ...inMemoryOrders.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber),
  ];
}

export function getInMemoryWorkOrders(): DetailedWorkOrder[] {
  return [...inMemoryOrders];
}

export function resetInMemoryWorkOrders(): void {
  inMemoryOrders = [...INITIAL_MOCK_WORK_ORDERS];
}

export interface WorkshopActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface DbWorkOrderRow {
  id: string;
  order_number: string;
  bay_id?: string | null;
  service_bays?: { name?: string | null } | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  vehicle_model?: string | null;
  plate_number?: string | null;
  service_code?: string | null;
  service_name?: string | null;
  mechanic_id?: string | null;
  profiles?: { id?: string; full_name?: string | null; name?: string | null } | null;
  status?: string | null;
  estimated_duration_minutes?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function mapDbRowToDetailedWorkOrder(
  row: DbWorkOrderRow,
  fallbackMechanicName?: string,
  now?: string
): DetailedWorkOrder {
  const mockMatch = inMemoryOrders.find((m) => m.orderNumber === row.order_number || m.id === row.id);
  const mechanicName =
    row.profiles?.full_name ??
    row.profiles?.name ??
    (row.mechanic_id === DANTE_REYES_PROFILE_ID ? 'Dante Reyes' : (fallbackMechanicName ?? mockMatch?.mechanicName));

  const status = (row.status || 'QUEUED') as WorkOrderStatus;
  const duration = row.estimated_duration_minutes ?? 30;

  return {
    id: row.id,
    orderNumber: row.order_number,
    bayId: row.bay_id ?? null,
    bayName: row.service_bays?.name ?? mockMatch?.bayName ?? 'Unassigned Bay',
    customerName: row.customer_name || 'Walk-in Customer',
    customerPhone: row.customer_phone ?? mockMatch?.customerPhone ?? '0917-000-0000',
    vehicleModel: row.vehicle_model || 'Motorcycle',
    plateNumber: row.plate_number || 'N/A',
    serviceCode: row.service_code || 'SRV-01',
    serviceName: row.service_name || 'Repair Service',
    mechanicId: row.mechanic_id ?? null,
    mechanicName,
    status,
    estimatedDurationMinutes: duration,
    remainingMinutes: calculateRemainingMinutes(row.started_at, duration),
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    notes: row.notes ?? mockMatch?.notes ?? null,
    laborTasks: mockMatch?.laborTasks ?? [
      { id: '1', description: 'Initial diagnostic & safety check', completed: status !== 'QUEUED' },
      { id: '2', description: 'Execute scheduled repair service', completed: status === 'COMPLETED' },
      { id: '3', description: 'Post-service road test & inspection', completed: status === 'COMPLETED' },
    ],
    requiredParts: mockMatch?.requiredParts ?? [],
    createdAt: row.created_at ?? (now || new Date().toISOString()),
    updatedAt: row.updated_at ?? (now || new Date().toISOString()),
  };
}

/**
 * Retrieves all active, queued, and completed work orders for workshop floor view.
 */
export async function fetchWorkshopOrdersAction(): Promise<WorkshopActionResult<DetailedWorkOrder[]>> {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createAdminClient } = await import('../supabase/server.ts');
        const supabase = createAdminClient();

        const { data: dbOrders, error } = await supabase
          .from('work_orders')
          .select(`
            *,
            service_bays (
              name
            ),
            profiles:mechanic_id (
              id,
              full_name
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && dbOrders && dbOrders.length > 0) {
          const rows = dbOrders as unknown as DbWorkOrderRow[];
          const mapped: DetailedWorkOrder[] = rows.map((row) => mapDbRowToDetailedWorkOrder(row));

          const dbOrderNumbers = new Set(rows.map((r) => r.order_number));
          const dbOrderIds = new Set(rows.map((r) => r.id));
          const extraInMemory = inMemoryOrders.filter(
            (m) => !dbOrderNumbers.has(m.orderNumber) && !dbOrderIds.has(m.id)
          );
          const combined = [...mapped, ...extraInMemory];

          return { success: true, data: combined };
        }
      } catch (clientErr) {
        console.warn('[Workshop Action] Supabase fetch fallback to in-memory:', clientErr);
      }
    }

    return {
      success: true,
      data: inMemoryOrders.map((order) => ({
        ...order,
        remainingMinutes: calculateRemainingMinutes(order.startedAt, order.estimatedDurationMinutes),
      })),
    };
  } catch (err) {
    console.error('[Workshop Action] Exception in fetchWorkshopOrdersAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown exception',
    };
  }
}

async function syncOrderStatusToDatabase(
  orderId: string,
  newStatus: WorkOrderStatus,
  now: string,
  existingOrder?: DetailedWorkOrder,
  notes?: string
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }
  try {
    const { createAdminClient } = await import('../supabase/server.ts');
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: now,
    };
    if (notes) updates.notes = notes;
    if (newStatus === 'IN PROGRESS' && !existingOrder?.startedAt) {
      updates.started_at = now;
    }
    if (newStatus === 'COMPLETED') {
      updates.completed_at = now;
    }

    if (UUID_REGEX.test(orderId)) {
      await supabase.from('work_orders').update(updates).or(`id.eq.${orderId},order_number.eq.${orderId}`);
    } else {
      await supabase.from('work_orders').update(updates).eq('order_number', orderId);
    }

    // Synchronize service bay status if linked
    if (existingOrder?.bayId) {
      let bayStatus = 'QUEUED';
      if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
        bayStatus = 'AVAILABLE';
      } else if (newStatus === 'IN PROGRESS' || newStatus === 'PENDING_PARTS') {
        bayStatus = 'OCCUPIED';
      }

      await supabase.from('service_bays').update({ status: bayStatus, updated_at: now }).eq('id', existingOrder.bayId);
    }

    // Broadcast Realtime status change
    try {
      const channel = supabase.channel('operational-intelligence');
      await channel.send({
        type: 'broadcast',
        event: 'WORK_ORDER_UPDATED',
        payload: {
          id: orderId,
          status: newStatus,
          updated_at: now,
        },
      });
    } catch {
      // Non-blocking
    }
  } catch (dbErr) {
    console.warn('[Workshop Action] Supabase update warning:', dbErr);
  }
}

/**
 * Updates a work order status with state machine validation and bay synchronization.
 */
async function fetchCurrentOrderStatusFromDb(
  orderId: string,
  existingOrder?: DetailedWorkOrder
): Promise<WorkOrderStatus | undefined> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return existingOrder?.status;
  }
  try {
    const { createAdminClient } = await import('../supabase/server.ts');
    const supabase = createAdminClient();
    const baseQuery = supabase.from('work_orders').select('id, order_number, status, bay_id, started_at');
    const query = UUID_REGEX.test(orderId)
      ? baseQuery.or(`id.eq.${orderId},order_number.eq.${orderId}`)
      : baseQuery.eq('order_number', orderId);

    const { data: dbOrder } = await query.maybeSingle();
    if (!dbOrder?.status) return existingOrder?.status;

    const currentStatus = dbOrder.status as WorkOrderStatus;
    if (existingOrder) {
      existingOrder.status = currentStatus;
      if (dbOrder.bay_id) existingOrder.bayId = dbOrder.bay_id;
    }
    return currentStatus;
  } catch (err) {
    console.warn('[Workshop Action] Supabase status check warning:', err);
    return existingOrder?.status;
  }
}

function updateOrderStatusInMemory(
  orderId: string,
  newStatus: WorkOrderStatus,
  now: string,
  notes?: string
): void {
  inMemoryOrders = inMemoryOrders.map((order) => {
    if (order.id !== orderId && order.orderNumber !== orderId) {
      return order;
    }
    return {
      ...order,
      status: newStatus,
      startedAt: newStatus === 'IN PROGRESS' && !order.startedAt ? now : order.startedAt,
      completedAt: newStatus === 'COMPLETED' ? now : order.completedAt,
      notes: notes ?? order.notes,
      updatedAt: now,
    };
  });
}

/**
 * Updates a work order status with state machine validation and bay synchronization.
 */
export async function updateWorkshopOrderStatusAction(
  orderId: string,
  newStatus: WorkOrderStatus,
  notes?: string
): Promise<WorkshopActionResult<{ orderId: string; status: WorkOrderStatus; updatedAt: string }>> {
  const now = new Date().toISOString();

  // Find target order and retrieve true current status from database if connected
  const existingOrder = inMemoryOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
  const currentStatus = await fetchCurrentOrderStatusFromDb(orderId, existingOrder);

  if (currentStatus && !validateWorkOrderStatusTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
    };
  }

  updateOrderStatusInMemory(orderId, newStatus, now, notes);

  try {
    await syncOrderStatusToDatabase(orderId, newStatus, now, existingOrder, notes);
    await safeRevalidatePaths();

    return {
      success: true,
      data: {
        orderId,
        status: newStatus,
        updatedAt: now,
      },
    };
  } catch (err) {
    console.error('[Workshop Action] Exception in updateWorkshopOrderStatusAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown exception',
    };
  }
}

async function broadcastWorkOrderAssigned(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  order: DetailedWorkOrder,
  now: string
): Promise<void> {
  try {
    const channel = supabase.channel('operational-intelligence');
    await channel.send({
      type: 'broadcast',
      event: 'WORK_ORDER_ASSIGNED',
      payload: {
        id: order.id,
        order_number: order.orderNumber,
        mechanic_id: order.mechanicId,
        mechanic_name: order.mechanicName,
        status: order.status,
        updated_at: now,
      },
    });
  } catch (broadcastErr) {
    console.warn('[Workshop Action] Supabase Realtime broadcast warning:', broadcastErr);
  }
}

async function executeDbClaimWorkOrder(
  orderId: string,
  mechanicId: string,
  mechanicName: string,
  autoStart: boolean,
  now: string
): Promise<DetailedWorkOrder | undefined> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return undefined;
  }
  try {
    const { createAdminClient } = await import('../supabase/server.ts');
    const supabase = createAdminClient();

    const baseQuery = supabase
      .from('work_orders')
      .select(`
        *,
        service_bays ( name ),
        profiles:mechanic_id ( id, full_name )
      `);
    const query = UUID_REGEX.test(orderId)
      ? baseQuery.or(`id.eq.${orderId},order_number.eq.${orderId}`)
      : baseQuery.eq('order_number', orderId);

    const { data: dbOrder, error: fetchErr } = await query.maybeSingle();
    if (!dbOrder || fetchErr) return undefined;

    const nextStatus = autoStart && (dbOrder.status === 'QUEUED' || !dbOrder.status)
      ? 'IN PROGRESS'
      : (dbOrder.status || 'IN PROGRESS');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      mechanic_id: mechanicId,
      updated_at: now,
    };
    if (nextStatus === 'IN PROGRESS') {
      updates.status = 'IN PROGRESS';
      if (!dbOrder.started_at) {
        updates.started_at = now;
      }
    }

    const { error: updateErr } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', dbOrder.id);

    if (updateErr) return undefined;

    if (dbOrder.bay_id && nextStatus === 'IN PROGRESS') {
      await supabase.from('service_bays').update({ status: 'OCCUPIED', updated_at: now }).eq('id', dbOrder.bay_id);
    }

    const row: DbWorkOrderRow = {
      ...dbOrder,
      mechanic_id: mechanicId,
      status: nextStatus,
      started_at: nextStatus === 'IN PROGRESS' ? (dbOrder.started_at ?? now) : dbOrder.started_at,
      updated_at: now,
    };

    const detailedOrder = mapDbRowToDetailedWorkOrder(row, mechanicName, now);
    await broadcastWorkOrderAssigned(supabase, detailedOrder, now);
    return detailedOrder;
  } catch (dbErr) {
    console.warn('[Workshop Action] Supabase claim update error:', dbErr);
    return undefined;
  }
}

function applyAssignmentInMemory(
  orderId: string,
  mechanicId: string,
  mechanicName: string,
  now: string,
  autoStart: boolean
): DetailedWorkOrder | undefined {
  let updatedOrder: DetailedWorkOrder | undefined;

  inMemoryOrders = inMemoryOrders.map((order) => {
    if (order.id !== orderId && order.orderNumber !== orderId) {
      return order;
    }
    const nextStatus = autoStart && order.status === 'QUEUED' ? 'IN PROGRESS' : order.status;
    const updated: DetailedWorkOrder = {
      ...order,
      mechanicId,
      mechanicName,
      status: nextStatus,
      startedAt: nextStatus === 'IN PROGRESS' ? (order.startedAt || now) : order.startedAt,
      updatedAt: now,
    };
    updatedOrder = updated;
    return updated;
  });

  return updatedOrder;
}

/**
 * Self-assigns ("Claims") an unassigned work order to the logged-in mechanic.
 */
export async function claimWorkOrderAction(
  orderId: string,
  mechanicId: string,
  mechanicName: string,
  autoStart = false
): Promise<WorkshopActionResult<DetailedWorkOrder>> {
  const now = new Date().toISOString();
  let updatedTarget = await executeDbClaimWorkOrder(orderId, mechanicId, mechanicName, autoStart, now);

  const inMemoryTarget = applyAssignmentInMemory(orderId, mechanicId, mechanicName, now, autoStart);
  updatedTarget ??= inMemoryTarget;

  if (updatedTarget && !inMemoryTarget) {
    inMemoryOrders.unshift(updatedTarget);
  }

  if (!updatedTarget) {
    return { success: false, error: `Work order not found: ${orderId}` };
  }

  await safeRevalidatePaths();
  return { success: true, data: updatedTarget };
}

export const DEFAULT_ON_SHIFT_MECHANICS: import('./intake-dispatch-contracts.ts').OnShiftMechanic[] = [
  {
    id: DANTE_REYES_PROFILE_ID,
    name: 'Dante Reyes',
    email: 'mechanic1@swift.local',
    role: 'mechanic',
    status: 'on_shift',
    clockInTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
];

async function querySupabaseOnShiftMechanics(): Promise<
  import('./intake-dispatch-contracts.ts').OnShiftMechanic[] | null
> {
  const { createAdminClient } = await import('../supabase/server.ts');
  const supabase = createAdminClient();

  const { data: shiftRows, error: shiftErr } = await supabase
    .from('staff_shifts')
    .select('id, profile_id, status, clock_in')
    .eq('status', 'on_shift');

  if (shiftErr || !shiftRows) return null;

  const profileIds = Array.from(new Set(shiftRows.map((s) => s.profile_id).filter(Boolean)));
  if (profileIds.length === 0) return null;

  const { data: profileRows, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, status')
    .in('id', profileIds)
    .or('role.eq.mechanic,role.eq.technician');

  if (profErr || !profileRows) return null;

  const shiftMap = new Map(shiftRows.map((s) => [s.profile_id, s]));
  return profileRows
    .filter((p) => p.status !== 'Inactive')
    .map((p) => ({
      id: p.id,
      name: p.full_name || 'Mechanic',
      email: p.email,
      role: 'mechanic' as const,
      status: 'on_shift' as const,
      clockInTime: shiftMap.get(p.id)?.clock_in || new Date().toISOString(),
    }));
}

/**
 * Fetches all workshop technicians who are currently clocked in (status = 'on_shift').
 * Queries public.staff_shifts and public.profiles, with mock fallback for offline resilience.
 */
export async function fetchOnShiftMechanicsAction(): Promise<
  WorkshopActionResult<import('./intake-dispatch-contracts.ts').OnShiftMechanic[]>
> {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const mechanics = await querySupabaseOnShiftMechanics();
        if (mechanics) {
          return { success: true, data: mechanics };
        }
      } catch (dbErr) {
        console.warn('[Workshop Action] Supabase on-shift mechanics query warning:', dbErr);
      }
    }

    return { success: true, data: DEFAULT_ON_SHIFT_MECHANICS };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown exception fetching on-shift mechanics',
      data: DEFAULT_ON_SHIFT_MECHANICS,
    };
  }
}

async function executeDbAssignMechanic(
  orderId: string,
  mechanicId: string,
  mechanicName: string,
  now: string
): Promise<DetailedWorkOrder | undefined> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return undefined;
  }
  try {
    const { createAdminClient } = await import('../supabase/server.ts');
    const supabase = createAdminClient();

    const baseQuery = supabase
      .from('work_orders')
      .select(`
        *,
        service_bays (
          name
        ),
        profiles:mechanic_id (
          id,
          full_name
        )
      `);
    const query = UUID_REGEX.test(orderId)
      ? baseQuery.or(`id.eq.${orderId},order_number.eq.${orderId}`)
      : baseQuery.eq('order_number', orderId);

    const { data: dbOrder, error: fetchErr } = await query.maybeSingle();
    if (!dbOrder || fetchErr) return undefined;

    const { error: updateErr } = await supabase
      .from('work_orders')
      .update({
        mechanic_id: mechanicId,
        updated_at: now,
      })
      .eq('id', dbOrder.id);

    if (updateErr) return undefined;

    const row: DbWorkOrderRow = {
      ...dbOrder,
      mechanic_id: mechanicId,
      updated_at: now,
    };

    const detailedOrder = mapDbRowToDetailedWorkOrder(row, mechanicName, now);
    await broadcastWorkOrderAssigned(supabase, detailedOrder, now);
    return detailedOrder;
  } catch (dbErr) {
    console.warn('[Workshop Action] Supabase assign update warning:', dbErr);
    return undefined;
  }
}

/**
 * Admin On-Shift Mechanic Work Order Dispatch (SIAA-101 Scenario 3).
 * Directly assigns an unassigned or queued work order to a selected on-shift mechanic.
 * Updates public.work_orders, syncs in-memory state, and broadcasts over 'operational-intelligence'.
 */
export async function assignMechanicAction(
  orderId: string,
  mechanicId: string,
  mechanicName: string
): Promise<WorkshopActionResult<DetailedWorkOrder>> {
  const now = new Date().toISOString();
  let updatedTarget = await executeDbAssignMechanic(orderId, mechanicId, mechanicName, now);

  const inMemoryTarget = applyAssignmentInMemory(orderId, mechanicId, mechanicName, now, false);
  updatedTarget ??= inMemoryTarget;

  if (updatedTarget && !inMemoryTarget) {
    inMemoryOrders.unshift(updatedTarget);
  }

  if (!updatedTarget) {
    return { success: false, error: `Work order not found: ${orderId}` };
  }

  await safeRevalidatePaths();
  return { success: true, data: updatedTarget };
}
