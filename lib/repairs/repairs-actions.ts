'use server';

import type { DetailedWorkOrder } from '../types/workshop.ts';
import type {
  AdminMotorRepairItem,
  RepairsDashboardKpiSummary,
  RepairsActionResult,
  AdminReassignMechanicInput,
} from './repairs-contracts.ts';
import { AdminReassignMechanicSchema } from './repairs-contracts.ts';
import {
  fetchWorkshopOrdersAction,
  assignMechanicAction,
  getInMemoryWorkOrders,
} from '../workshop/workshop-actions.ts';
import { logSecurityEventAction } from '../admin/audit-actions.ts';
import { mapToAdminMotorRepairItem, computeRepairsKpiSummary } from './repairs-utils.ts';

async function safeRevalidatePaths(): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/repairs');
    revalidatePath('/staff/work-orders');
    revalidatePath('/admin');
  } catch {
    // Revalidation not active in pure unit test runner
  }
}

/**
 * Server action to fetch all active repair work orders and calculate live dashboard KPIs.
 */
export async function fetchAdminRepairsAction(): Promise<
  RepairsActionResult<{ items: AdminMotorRepairItem[]; summary: RepairsDashboardKpiSummary }>
> {
  try {
    const ordersResult = await fetchWorkshopOrdersAction();
    const rawOrders: DetailedWorkOrder[] = ordersResult.success && ordersResult.data
      ? ordersResult.data
      : getInMemoryWorkOrders();

    const items = rawOrders.map(mapToAdminMotorRepairItem);
    const summary = computeRepairsKpiSummary(items);

    return {
      success: true,
      data: {
        items,
        summary,
      },
    };
  } catch (error) {
    const fallbackItems = getInMemoryWorkOrders().map(mapToAdminMotorRepairItem);
    return {
      success: true,
      data: {
        items: fallbackItems,
        summary: computeRepairsKpiSummary(fallbackItems),
      },
      error: error instanceof Error ? error.message : 'Fallback to memory store',
    };
  }
}

/**
 * Server action for administrative reassignment of a repair job to an on-shift mechanic.
 */
export async function reassignMotorRepairMechanicAction(
  rawInput: AdminReassignMechanicInput
): Promise<RepairsActionResult<AdminMotorRepairItem>> {
  const parsed = AdminReassignMechanicSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid reassignment parameters',
    };
  }

  const { workOrderId, orderNumber, mechanicId, mechanicName, bayId, bayName, reason } = parsed.data;

  try {
    // Execute workshop mechanic assignment
    const assignResult = await assignMechanicAction(workOrderId, mechanicId, mechanicName);
    if (!assignResult.success) {
      return {
        success: false,
        error: assignResult.error || 'Failed to assign mechanic to work order',
      };
    }

    // Record forensic audit log entry
    await logSecurityEventAction({
      action: `Admin reassigned work order ${orderNumber} to mechanic ${mechanicName}`,
      severity: 'info',
      metadata: {
        workOrderId,
        orderNumber,
        mechanicId,
        mechanicName,
        bayId: bayId ?? null,
        bayName: bayName ?? null,
        reason: reason ?? 'Admin workshop dispatch reassignment',
      },
    });

    await safeRevalidatePaths();

    // Retrieve updated item
    const refreshed = await fetchAdminRepairsAction();
    const updated = refreshed.data?.items.find((item) => item.id === workOrderId || item.orderNumber === orderNumber);

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reassign mechanic',
    };
  }
}
