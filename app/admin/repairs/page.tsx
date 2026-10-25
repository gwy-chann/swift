import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession, evaluateRouteAccess } from '@/lib/auth/session-guards';
import {
  fetchAdminRepairsAction,
  reassignMotorRepairMechanicAction,
} from '@/lib/repairs/repairs-actions';
import { fetchOnShiftMechanicsAction } from '@/lib/workshop/workshop-actions';
import { MOCK_SERVICE_BAYS } from '@/lib/workshop/workshop-mock-data';
import { AdminRepairsClient } from '@/components/admin/repairs/admin-repairs-client';

export const metadata: Metadata = {
  title: 'SWIFT - Workshop Motor Repair Tracking & Service Bays',
  description: 'Live executive dashboard for customer motorcycle repairs, parts inspection, and mechanic dispatch monitoring',
};

export default async function AdminRepairsPage() {
  // Enforce strict Role-Based Access Control (RBAC)
  const session = await getServerSession();
  const decision = evaluateRouteAccess('/admin/repairs', session);

  if (decision.action === 'REDIRECT' && decision.destination) {
    redirect(decision.destination);
  }

  // Load initial workshop repairs feed
  const repairsResult = await fetchAdminRepairsAction();
  const initialItems = repairsResult.data?.items ?? [];
  const initialSummary = repairsResult.data?.summary ?? {
    activeRepairsCount: 0,
    inProgressCount: 0,
    waitingForPartsCount: 0,
    completedTodayCount: 0,
    occupiedBays: 0,
    totalBays: 4,
    bayUtilizationPercent: 0,
  };

  // Load eligible on-shift mechanics
  const mechanicsResult = await fetchOnShiftMechanicsAction();
  const availableMechanics = mechanicsResult.success && mechanicsResult.data
    ? mechanicsResult.data.map((m) => ({ id: m.id, name: m.name, status: m.status }))
    : [
        { id: 'd0000000-0000-0000-0000-000000000003', name: 'Dante Reyes', status: 'on_shift' },
        { id: 'd0000000-0000-0000-0000-000000000004', name: 'Alex Lim', status: 'on_shift' },
      ];

  const baysList = MOCK_SERVICE_BAYS.map((b) => ({ id: b.id, name: b.name }));

  // Server action bridge for live re-fetching
  async function refreshRepairs() {
    'use server';
    const res = await fetchAdminRepairsAction();
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  // Server action bridge for reassignment
  async function reassignMechanic(
    workOrderId: string,
    orderNumber: string,
    mechanicId: string,
    mechanicName: string,
    bayId?: string | null,
    reason?: string
  ) {
    'use server';
    const res = await reassignMotorRepairMechanicAction({
      workOrderId,
      orderNumber,
      mechanicId,
      mechanicName,
      bayId,
      reason,
    });
    return res.success;
  }

  return (
    <AdminRepairsClient
      initialItems={initialItems}
      initialSummary={initialSummary}
      availableMechanics={availableMechanics}
      baysList={baysList}
      onRefresh={refreshRepairs}
      onReassignMechanic={reassignMechanic}
    />
  );
}
