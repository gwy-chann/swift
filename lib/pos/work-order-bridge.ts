import type { CheckoutPayload, CheckoutItemPayload } from '../types/transaction.ts';
import type { DetailedWorkOrder } from '../types/workshop.ts';
import { appendInMemoryWorkOrder } from '../workshop/workshop-actions.ts';

export interface AutoProvisionResult {
  created: number;
  workOrderNumbers: string[];
  workOrders: DetailedWorkOrder[];
}

function generateWorkOrderNumber(seedOffset = 0): string {
  const year = new Date().getFullYear();
  let randomSuffix = 1000 + seedOffset;
  try {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    randomSuffix = 1000 + (array[0] % 9000) + seedOffset;
  } catch {
    randomSuffix = 1000 + (Date.now() % 9000) + seedOffset;
  }
  return `WO-${year}-${randomSuffix}`;
}

async function resolveServiceBay(
  bayNameOrCode?: string | null
): Promise<{ bayId: string | null; bayName: string }> {
  if (!bayNameOrCode) {
    return { bayId: null, bayName: 'Unassigned Bay' };
  }

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { createClient } = await import('../supabase/server.ts');
      const supabase = await createClient();

      // Look up bay by exact name or case-insensitive match
      const { data: bays } = await supabase
        .from('service_bays')
        .select('id, name')
        .ilike('name', `%${bayNameOrCode.trim()}%`)
        .limit(1);

      if (bays && bays.length > 0) {
        return { bayId: bays[0].id, bayName: bays[0].name };
      }
    }
  } catch (err) {
    console.warn('[WorkOrderBridge] Service bay lookup warning:', err);
  }

  return { bayId: null, bayName: bayNameOrCode.trim() };
}

/**
 * Automatically provisions active work order records in the database and in-memory cache
 * whenever a completed POS checkout contains workshop labor service line items.
 *
 * Honors SIAA-100 scenarios:
 * - Scenario 1: Auto-provisioning work orders from POS labor items (status: QUEUED).
 * - Scenario 2: Realtime broadcast trigger on 'operational-intelligence'.
 * - Scenario 3: Unassigned work order claim flow (mechanic_id = null).
 * - Scenario 4: Pure parts transactions skip work order creation (returns 0).
 */
export async function autoProvisionWorkOrdersFromCheckout(
  payload: CheckoutPayload,
  receiptNumber: string
): Promise<AutoProvisionResult> {
  const serviceItems = (payload.items || []).filter(
    (item: CheckoutItemPayload) => item.itemType === 'service'
  );

  // Scenario 4: Pure physical parts checkout skips work order creation
  if (serviceItems.length === 0) {
    return {
      created: 0,
      workOrderNumbers: [],
      workOrders: [],
    };
  }

  const now = new Date().toISOString();
  const createdOrders: DetailedWorkOrder[] = [];
  const orderNumbers: string[] = [];

  for (let i = 0; i < serviceItems.length; i++) {
    const item = serviceItems[i];
    const orderNumber = generateWorkOrderNumber(i);
    const { bayId, bayName } = await resolveServiceBay(item.bay);

    const customerName = payload.customerName?.trim() || 'Walk-in Customer';
    const customerPhone = payload.customerPhone?.trim() || '0917-000-0000';
    const vehicleModel = payload.vehicleModel?.trim() || 'Motorcycle (General)';
    const plateNumber = payload.plateNumber?.trim() || 'FOR-REG';
    const notes =
      payload.notes?.trim() ||
      payload.technicianNotes?.trim() ||
      `POS Fast-lane Checkout: ${item.itemName} (Receipt #${receiptNumber})`;

    // Generate unique ID
    let orderId: string;
    try {
      orderId = crypto.randomUUID();
    } catch {
      orderId = `wo-${Date.now()}-${i}`;
    }

    const newWorkOrder: DetailedWorkOrder = {
      id: orderId,
      orderNumber,
      bayId,
      bayName,
      customerName,
      customerPhone,
      vehicleModel,
      plateNumber,
      serviceCode: item.itemSkuOrCode,
      serviceName: item.itemName,
      mechanicId: null, // Scenario 3: Unassigned
      status: 'QUEUED', // Scenario 1: QUEUED
      estimatedDurationMinutes: 30,
      startedAt: null,
      completedAt: null,
      notes,
      laborTasks: [
        {
          id: '1',
          description: `Execute ${item.itemName}`,
          completed: false,
        },
      ],
      requiredParts: [],
      createdAt: now,
      updatedAt: now,
    };

    // 1. Database Persistence (Supabase PostgreSQL)
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();

        await supabase.from('work_orders').insert({
          id: newWorkOrder.id,
          order_number: newWorkOrder.orderNumber,
          bay_id: newWorkOrder.bayId,
          customer_name: newWorkOrder.customerName,
          customer_phone: newWorkOrder.customerPhone,
          vehicle_model: newWorkOrder.vehicleModel,
          plate_number: newWorkOrder.plateNumber,
          service_code: newWorkOrder.serviceCode,
          service_name: newWorkOrder.serviceName,
          mechanic_id: null,
          status: 'QUEUED',
          estimated_duration_minutes: newWorkOrder.estimatedDurationMinutes,
          notes: newWorkOrder.notes,
          created_at: now,
          updated_at: now,
        });

        // Scenario 2: Supabase Realtime broadcast on 'operational-intelligence'
        try {
          const channel = supabase.channel('operational-intelligence');
          await channel.send({
            type: 'broadcast',
            event: 'WORK_ORDER_CREATED',
            payload: {
              id: newWorkOrder.id,
              order_number: newWorkOrder.orderNumber,
              bay_id: newWorkOrder.bayId,
              bay_name: newWorkOrder.bayName,
              customer_name: newWorkOrder.customerName,
              customer_phone: newWorkOrder.customerPhone,
              customerPhone: newWorkOrder.customerPhone,
              vehicle_model: newWorkOrder.vehicleModel,
              plate_number: newWorkOrder.plateNumber,
              service_code: newWorkOrder.serviceCode,
              service_name: newWorkOrder.serviceName,
              mechanic_id: null,
              status: 'QUEUED',
              estimated_duration_minutes: newWorkOrder.estimatedDurationMinutes,
              notes: newWorkOrder.notes,
              created_at: now,
              updated_at: now,
            },
          });
        } catch (broadcastErr) {
          console.warn('[WorkOrderBridge] Supabase Realtime broadcast warning:', broadcastErr);
        }
      }
    } catch (dbErr) {
      console.warn('[WorkOrderBridge] Database insert error (fallback will apply):', dbErr);
    }

    // 2. In-Memory Cache Persistence (Resilient for tests & offline dev)
    appendInMemoryWorkOrder(newWorkOrder);

    createdOrders.push(newWorkOrder);
    orderNumbers.push(orderNumber);
  }

  return {
    created: createdOrders.length,
    workOrderNumbers: orderNumbers,
    workOrders: createdOrders,
  };
}
