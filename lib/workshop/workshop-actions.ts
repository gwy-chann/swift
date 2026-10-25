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

/**
 * Retrieves all active, queued, and completed work orders for workshop floor view.
 */
export async function fetchWorkshopOrdersAction(): Promise<WorkshopActionResult<DetailedWorkOrder[]>> {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();

        const { data: dbOrders, error } = await supabase
          .from('work_orders')
          .select(`
            *,
            service_bays (
              name
            ),
            profiles:mechanic_id (
              name
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && dbOrders && dbOrders.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: DetailedWorkOrder[] = dbOrders.map((row: any) => {
            const mockMatch = inMemoryOrders.find((m) => m.orderNumber === row.order_number || m.id === row.id);
            return {
              id: row.id,
              orderNumber: row.order_number,
              bayId: row.bay_id ?? null,
              bayName: row.service_bays?.name ?? mockMatch?.bayName ?? 'Unassigned Bay',
              customerName: row.customer_name,
              customerPhone: mockMatch?.customerPhone ?? '0917-000-0000',
              vehicleModel: row.vehicle_model,
              plateNumber: row.plate_number,
              serviceCode: row.service_code,
              serviceName: row.service_name,
              mechanicId: row.mechanic_id ?? null,
              mechanicName: row.profiles?.name ?? (row.mechanic_id === DANTE_REYES_PROFILE_ID ? 'Dante Reyes' : mockMatch?.mechanicName),
              status: row.status as WorkOrderStatus,
              estimatedDurationMinutes: row.estimated_duration_minutes ?? 30,
              remainingMinutes: calculateRemainingMinutes(row.started_at, row.estimated_duration_minutes ?? 30),
              startedAt: row.started_at ?? null,
              completedAt: row.completed_at ?? null,
              notes: row.notes ?? mockMatch?.notes ?? null,
              laborTasks: mockMatch?.laborTasks ?? [
                { id: '1', description: 'Initial diagnostic & safety check', completed: row.status !== 'QUEUED' },
                { id: '2', description: 'Execute scheduled repair service', completed: row.status === 'COMPLETED' },
                { id: '3', description: 'Post-service road test & inspection', completed: row.status === 'COMPLETED' },
              ],
              requiredParts: mockMatch?.requiredParts ?? [],
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
          });

          return { success: true, data: mapped };
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
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: now,
    };
    if (notes) updates.notes = notes;
    if (newStatus === 'IN PROGRESS' && (!existingOrder || !existingOrder.startedAt)) {
      updates.started_at = now;
    }
    if (newStatus === 'COMPLETED') {
      updates.completed_at = now;
    }

    await supabase.from('work_orders').update(updates).eq('id', orderId);

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
  } catch (dbErr) {
    console.warn('[Workshop Action] Supabase update warning:', dbErr);
  }
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

  // Find target order
  const existingOrder = inMemoryOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
  if (existingOrder && !validateWorkOrderStatusTransition(existingOrder.status, newStatus)) {
    return {
      success: false,
      error: `Invalid status transition from ${existingOrder.status} to ${newStatus}`,
    };
  }

  // Update in-memory state
  inMemoryOrders = inMemoryOrders.map((order) => {
    if (order.id === orderId || order.orderNumber === orderId) {
      return {
        ...order,
        status: newStatus,
        startedAt: newStatus === 'IN PROGRESS' && !order.startedAt ? now : order.startedAt,
        completedAt: newStatus === 'COMPLETED' ? now : order.completedAt,
        notes: notes ?? order.notes,
        updatedAt: now,
      };
    }
    return order;
  });

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
  let updatedTarget: DetailedWorkOrder | undefined;

  inMemoryOrders = inMemoryOrders.map((order) => {
    if (order.id === orderId || order.orderNumber === orderId) {
      const nextStatus = autoStart && order.status === 'QUEUED' ? 'IN PROGRESS' : order.status;
      updatedTarget = {
        ...order,
        mechanicId,
        mechanicName,
        status: nextStatus,
        startedAt: nextStatus === 'IN PROGRESS' ? now : order.startedAt,
        updatedAt: now,
      };
      return updatedTarget;
    }
    return order;
  });

  if (!updatedTarget) {
    return { success: false, error: `Work order not found: ${orderId}` };
  }

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {
          mechanic_id: mechanicId,
          updated_at: now,
        };
        if (updatedTarget.status === 'IN PROGRESS') {
          updates.status = 'IN PROGRESS';
          updates.started_at = now;
        }

        await supabase.from('work_orders').update(updates).eq('id', orderId);
      } catch (dbErr) {
        console.warn('[Workshop Action] Supabase claim update warning:', dbErr);
      }
    }

    await safeRevalidatePaths();

    return { success: true, data: updatedTarget };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown exception',
    };
  }
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
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    name: 'Alex Lim',
    email: 'alex.lim@swift.local',
    role: 'mechanic',
    status: 'on_shift',
    clockInTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

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
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();

        const { data, error } = await supabase
          .from('staff_shifts')
          .select('id, profile_id, status, clock_in, profiles:profile_id ( id, full_name, email, role )')
          .eq('status', 'on_shift');

        if (!error && data && data.length > 0) {
          const mechanics = data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((row: any) => {
              const prof = row.profiles;
              return prof && (prof.role === 'mechanic' || prof.role === 'technician');
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((row: any) => ({
              id: row.profiles.id,
              name: row.profiles.full_name || 'Mechanic',
              email: row.profiles.email,
              role: 'mechanic' as const,
              status: 'on_shift' as const,
              clockInTime: row.clock_in,
            }));

          if (mechanics.length > 0) {
            return { success: true, data: mechanics };
          }
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
  let updatedTarget: DetailedWorkOrder | undefined;

  inMemoryOrders = inMemoryOrders.map((order) => {
    if (order.id === orderId || order.orderNumber === orderId) {
      updatedTarget = {
        ...order,
        mechanicId,
        mechanicName,
        updatedAt: now,
      };
      return updatedTarget;
    }
    return order;
  });

  if (!updatedTarget) {
    return { success: false, error: `Work order not found: ${orderId}` };
  }

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();

        await supabase
          .from('work_orders')
          .update({
            mechanic_id: mechanicId,
            updated_at: now,
          })
          .or(`id.eq.${orderId},order_number.eq.${orderId}`);

        // Broadcast assignment over Supabase Realtime 'operational-intelligence' channel
        try {
          const channel = supabase.channel('operational-intelligence');
          await channel.send({
            type: 'broadcast',
            event: 'WORK_ORDER_ASSIGNED',
            payload: {
              id: updatedTarget.id,
              order_number: updatedTarget.orderNumber,
              mechanic_id: mechanicId,
              mechanic_name: mechanicName,
              status: updatedTarget.status,
              updated_at: now,
            },
          });
        } catch (broadcastErr) {
          console.warn('[Workshop Action] Supabase Realtime broadcast warning:', broadcastErr);
        }
      } catch (dbErr) {
        console.warn('[Workshop Action] Supabase assign update warning:', dbErr);
      }
    }

    await safeRevalidatePaths();

    return { success: true, data: updatedTarget };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown exception during mechanic assignment',
    };
  }
}
