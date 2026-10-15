'use client';

import React, { useState } from 'react';
import { AdminKpiGrid } from '@/components/admin/admin-kpi-grid';
import { RevenueComparisonChart } from '@/components/admin/revenue-comparison-chart';
import { ServiceBayStatusCard, type ServiceBayDisplayItem } from '@/components/admin/service-bay-status';
import { useExecutiveRealtime } from '@/lib/analytics/use-executive-realtime';
import type { ExecutiveKpiData, WeeklyRevenueData } from '@/lib/types/analytics';

export interface AdminDashboardClientProps {
  initialKpis?: ExecutiveKpiData;
  initialRevenueTrend?: WeeklyRevenueData;
  initialServiceBays?: ServiceBayDisplayItem[];
}

const INITIAL_SERVICE_BAYS: ServiceBayDisplayItem[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    bayName: 'Bay 1 (Quick Bay)',
    status: 'IN PROGRESS',
    vehicleService: 'Yamaha NMAX 155 • Oil Change + Brake Pads',
    mechanicInfo: 'Mechanic: Dante Reyes (~10 mins left)',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    bayName: 'Bay 2 (Scooter Bay)',
    status: 'IN PROGRESS',
    vehicleService: 'Honda Click 150i • Full CVT Overhaul',
    mechanicInfo: 'Mechanic: Alex Lim (~25 mins left)',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    bayName: 'Bay 3 (Mechanical Bay)',
    status: 'QUEUED',
    vehicleService: 'Suzuki Raider 150 Fi • Clutch Replacement',
    mechanicInfo: 'Waiting for Bay clearance',
  },
];

function getWorkOrderStatusDetail(status: string): string {
  if (status === 'COMPLETED') {
    return 'Ready for pickup';
  }
  if (status === 'PENDING_PARTS') {
    return 'Waiting for counter parts';
  }
  return 'In Progress';
}

export function AdminDashboardClient({
  initialKpis,
  initialRevenueTrend,
  initialServiceBays,
}: AdminDashboardClientProps = {}) {
  const [grossRevenue, setGrossRevenue] = useState(
    initialKpis?.gross_revenue_today ?? 45230.0
  );
  const [livePulse, setLivePulse] = useState(false);
  const [salesIncrement, setSalesIncrement] = useState<number | null>(null);
  const [todayPartsIncrement, setTodayPartsIncrement] = useState(0);

  const [activeWorkOrders, setActiveWorkOrders] = useState(
    initialKpis?.active_work_orders_count ?? 8
  );
  const [pendingPartsWorkOrders, setPendingPartsWorkOrders] = useState(
    initialKpis?.pending_parts_count ?? 3
  );

  const [lowStockCount, setLowStockCount] = useState(
    initialKpis?.critical_low_stock_count ?? 3
  );
  const [isLowStockDanger, setIsLowStockDanger] = useState(
    (initialKpis?.critical_low_stock_count ?? 3) > 0
  );

  const [serviceBays, setServiceBays] = useState<ServiceBayDisplayItem[]>(
    initialServiceBays ?? INITIAL_SERVICE_BAYS
  );

  // Unified executive realtime subscription to operational-intelligence
  useExecutiveRealtime({
    channelName: 'operational-intelligence',
    onTransaction: (tx) => {
      const amount = tx.total_due || 0;
      setGrossRevenue((prev) => prev + amount);
      setSalesIncrement(amount);
      setTodayPartsIncrement((prev) => prev + amount);
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 4000);
    },
    onWorkOrderChange: (wo) => {
      if (wo.status === 'PENDING_PARTS') {
        setPendingPartsWorkOrders((prev) => prev + 1);
      } else if (wo.status === 'COMPLETED') {
        setActiveWorkOrders((prev) => Math.max(0, prev - 1));
      }

      setServiceBays((prev) =>
        prev.map((bay, idx) => {
          const isTarget = wo.bay_id ? bay.id === wo.bay_id : idx === 0;
          if (isTarget) {
            const statusDetail = getWorkOrderStatusDetail(wo.status);
            return {
              ...bay,
              status: wo.status,
              vehicleService: `${wo.vehicle_model} • ${wo.service_name}`,
              mechanicInfo: `Mechanic: Dante Reyes (${statusDetail})`,
            };
          }
          return bay;
        })
      );
    },
    onStockAlert: () => {
      setLowStockCount((prev) => prev + 1);
      setIsLowStockDanger(true);
    },
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Welcome & Context Banner */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
          Operational Intelligence Dashboard
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Live workshop metrics, bay queue performance, and real-time revenue analytics.
        </p>
      </div>

      {/* 4 KPI Stat Cards Grid with Realtime POS Sales Subscription */}
      <AdminKpiGrid
        grossRevenue={grossRevenue}
        livePulse={livePulse}
        salesIncrement={salesIncrement}
        activeWorkOrders={activeWorkOrders}
        pendingPartsWorkOrders={pendingPartsWorkOrders}
        lowStockCount={lowStockCount}
        isLowStockDanger={isLowStockDanger}
        netProfitMarginPct={initialKpis?.net_profit_margin_pct}
        grossProfitAmount={initialKpis?.gross_profit_amount}
        revenueGrowthPct={initialKpis?.revenue_growth_pct}
      />

      {/* Dashboard Analytics & Service Bay Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueComparisonChart
            todayPartsIncrement={todayPartsIncrement}
            initialWeeklyData={initialRevenueTrend}
          />
        </div>
        <div className="lg:col-span-1">
          <ServiceBayStatusCard bays={serviceBays} />
        </div>
      </div>
    </div>
  );
}
