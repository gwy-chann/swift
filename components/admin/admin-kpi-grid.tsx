'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Wrench,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { PesoIcon } from '@/components/icons/peso-icon';
import { useExecutiveRealtime } from '@/lib/analytics/use-executive-realtime';

export interface AdminKpiGridProps {
  grossRevenue?: number;
  livePulse?: boolean;
  salesIncrement?: number | null;
  activeWorkOrders?: number;
  pendingPartsWorkOrders?: number;
  lowStockCount?: number;
  isLowStockDanger?: boolean;
}

export function AdminKpiGrid(props: AdminKpiGridProps = {}) {
  // Standalone fallback states if props are not supplied by a parent coordinator
  const [internalGrossRevenue, setInternalGrossRevenue] = useState(45230.0);
  const [internalLivePulse, setInternalLivePulse] = useState(false);
  const [internalSalesIncrement, setInternalSalesIncrement] = useState<number | null>(null);
  const [internalActiveOrders, setInternalActiveOrders] = useState(8);
  const [internalPendingParts, setInternalPendingParts] = useState(3);
  const [internalLowStockCount, setInternalLowStockCount] = useState(3);
  const [internalStockDanger, setInternalStockDanger] = useState(false);

  const isControlled = props.grossRevenue !== undefined;

  // Use the canonical executive realtime broadcast hook when standalone
  useExecutiveRealtime({
    enabled: !isControlled,
    onTransaction: (tx) => {
      setInternalGrossRevenue((prev) => prev + tx.total_due);
      setInternalSalesIncrement(tx.total_due);
      setInternalLivePulse(true);
      setTimeout(() => setInternalLivePulse(false), 4000);
    },
    onWorkOrderChange: (wo) => {
      if (wo.status === 'PENDING_PARTS') {
        setInternalPendingParts((prev) => prev + 1);
      }
    },
    onStockAlert: () => {
      setInternalLowStockCount((prev) => prev + 1);
      setInternalStockDanger(true);
    },
  });

  const grossRevenue = isControlled ? props.grossRevenue! : internalGrossRevenue;
  const livePulse = isControlled ? (props.livePulse ?? false) : internalLivePulse;
  const salesIncrement = isControlled ? props.salesIncrement : internalSalesIncrement;
  const activeOrders = isControlled ? (props.activeWorkOrders ?? 8) : internalActiveOrders;
  const pendingParts = isControlled ? (props.pendingPartsWorkOrders ?? 3) : internalPendingParts;
  const lowStockCount = isControlled ? (props.lowStockCount ?? 3) : internalLowStockCount;
  const isStockDanger = isControlled ? (props.isLowStockDanger ?? false) : internalStockDanger;

  const kpiCards = [
    {
      title: 'Gross Revenue',
      badge: livePulse ? 'LIVE' : 'Today',
      badgeVariant: livePulse ? 'live' : 'default',
      value: `₱${grossRevenue.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtext: livePulse && salesIncrement !== null && salesIncrement !== undefined
        ? `+₱${salesIncrement.toFixed(2)} sale just received!`
        : '+14.2% vs yesterday',
      subtextColor: 'text-success',
      icon: PesoIcon,
    },
    {
      title: 'Work Orders Queue',
      badge: 'Service Bay',
      badgeVariant: 'default',
      value: `${activeOrders} Active`,
      subtext: `${pendingParts} Pending Parts Assembly`,
      subtextColor: 'text-accent',
      icon: Wrench,
    },
    {
      title: 'Net Profit Margin',
      badge: 'This Month',
      badgeVariant: 'default',
      value: '34.8%',
      subtext: '₱182,400.00 Gross Profit',
      subtextColor: 'text-success',
      icon: TrendingUp,
    },
    {
      title: 'Critical Low Stock',
      badge: isStockDanger ? 'ALERT' : 'Action Req',
      badgeVariant: isStockDanger ? 'danger' : 'default',
      value: `${lowStockCount} SKUs`,
      valueColor: isStockDanger ? 'text-danger' : 'text-text-primary',
      subtext: isStockDanger ? 'Restock immediately' : 'Below threshold limit',
      subtextColor: isStockDanger ? 'text-danger' : 'text-text-muted',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.title}
            className={`p-5 rounded-lg bg-bg-card border transition-all flex flex-col justify-between shadow-xs ${
              kpi.badgeVariant === 'live'
                ? 'border-success/60 ring-1 ring-success/30'
                : kpi.badgeVariant === 'danger'
                ? 'border-danger/60 ring-1 ring-danger/30'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-text-muted shrink-0" />
                <span className="text-xs font-semibold text-text-muted">
                  {kpi.title}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  kpi.badgeVariant === 'danger'
                    ? 'bg-danger-light text-danger border border-danger/30'
                    : kpi.badgeVariant === 'live'
                    ? 'bg-success-light text-success border border-success/40 animate-pulse'
                    : 'bg-bg-muted text-text-secondary border border-border-subtle'
                }`}
              >
                {kpi.badgeVariant === 'live' && (
                  <Radio className="w-2.5 h-2.5 text-success animate-ping" />
                )}
                {kpi.badge}
              </span>
            </div>

            <div>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  kpi.valueColor || 'text-text-primary'
                }`}
              >
                {kpi.value}
              </div>
              <div
                className={`text-xs font-semibold mt-1 flex items-center gap-1 ${kpi.subtextColor}`}
              >
                <span>{kpi.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
