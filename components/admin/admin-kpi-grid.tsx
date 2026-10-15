'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Wrench,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { PesoIcon } from '@/components/icons/peso-icon';
import { useExecutiveRealtime } from '@/lib/analytics/use-executive-realtime';
import {
  formatPhilippinePeso,
  calculateGrowthVariance,
  formatWorkOrdersQueue,
  formatNetProfitMargin,
  deriveCriticalLowStockState,
} from '@/lib/analytics/kpi-calculator';

export interface AdminKpiGridProps {
  grossRevenue?: number;
  grossRevenueYesterday?: number;
  revenueGrowthPct?: number;
  livePulse?: boolean;
  salesIncrement?: number | null;
  activeWorkOrders?: number;
  pendingPartsWorkOrders?: number;
  netProfitMarginPct?: number;
  grossProfitAmount?: number;
  lowStockCount?: number;
  isLowStockDanger?: boolean;
  onLowStockClick?: () => void;
  lowStockHref?: string;
}

interface KpiCardItem {
  id: string;
  title: string;
  badge: string;
  badgeVariant: 'default' | 'live' | 'danger';
  value: string;
  valueColor?: string;
  subtext: string;
  subtextColor: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

function getRevenueSubtext(
  livePulse: boolean,
  salesIncrement: number | null | undefined,
  varianceText: string
): string {
  if (livePulse && salesIncrement !== null && salesIncrement !== undefined) {
    return `+₱${salesIncrement.toFixed(2)} sale just received!`;
  }
  return varianceText;
}

function getCardBorderClass(variant: string): string {
  if (variant === 'live') {
    return 'border-success/60 ring-1 ring-success/30';
  }
  if (variant === 'danger') {
    return 'border-danger/60 ring-1 ring-danger/30 hover:border-danger';
  }
  return 'border-border hover:border-primary/40';
}

function getBadgeStyleClass(variant: string): string {
  if (variant === 'danger') {
    return 'bg-danger-light text-danger border border-danger/30';
  }
  if (variant === 'live') {
    return 'bg-success-light text-success border border-success/40 animate-pulse';
  }
  return 'bg-bg-muted text-text-secondary border border-border-subtle';
}

function KpiCardInner({ kpi }: { kpi: KpiCardItem }) {
  const Icon = kpi.icon;
  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-muted shrink-0" />
          <span className="text-xs font-semibold text-text-muted">
            {kpi.title}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getBadgeStyleClass(
            kpi.badgeVariant
          )}`}
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
    </>
  );
}

export function AdminKpiGrid(props: AdminKpiGridProps = {}) {
  const [internalGrossRevenue, setInternalGrossRevenue] = useState(45230.0);
  const [internalLivePulse, setInternalLivePulse] = useState(false);
  const [internalSalesIncrement, setInternalSalesIncrement] = useState<number | null>(null);
  const [internalPendingParts, setInternalPendingParts] = useState(3);
  const [internalLowStockCount, setInternalLowStockCount] = useState(3);
  const [internalStockDanger, setInternalStockDanger] = useState(false);

  const isControlled = props.grossRevenue !== undefined;

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
  const activeOrders = isControlled ? (props.activeWorkOrders ?? 8) : 8;
  const pendingParts = isControlled ? (props.pendingPartsWorkOrders ?? 3) : internalPendingParts;
  const lowStockCount = isControlled ? (props.lowStockCount ?? 3) : internalLowStockCount;
  const isStockDanger = isControlled ? (props.isLowStockDanger ?? false) : internalStockDanger;

  // Calculation synthesis
  const revenueVariance = calculateGrowthVariance(
    grossRevenue,
    props.grossRevenueYesterday,
    props.revenueGrowthPct
  );
  const workOrdersQueue = formatWorkOrdersQueue(activeOrders, pendingParts);
  const netProfit = formatNetProfitMargin(
    props.netProfitMarginPct ?? 34.8,
    props.grossProfitAmount ?? 182400.0
  );
  const lowStockState = deriveCriticalLowStockState(
    lowStockCount,
    isStockDanger,
    props.lowStockHref
  );

  const kpiCards: KpiCardItem[] = [
    {
      id: 'kpi-gross-revenue',
      title: 'Gross Revenue',
      badge: livePulse ? 'LIVE' : 'Today',
      badgeVariant: livePulse ? 'live' : 'default',
      value: formatPhilippinePeso(grossRevenue),
      subtext: getRevenueSubtext(livePulse, salesIncrement, revenueVariance.formattedText),
      subtextColor: livePulse || revenueVariance.isPositive ? 'text-success' : 'text-danger',
      icon: PesoIcon,
    },
    {
      id: 'kpi-work-orders',
      title: 'Work Orders Queue',
      badge: 'Service Bay',
      badgeVariant: 'default',
      value: workOrdersQueue.value,
      subtext: workOrdersQueue.subtext,
      subtextColor: 'text-accent',
      icon: Wrench,
    },
    {
      id: 'kpi-net-profit',
      title: 'Net Profit Margin',
      badge: 'This Month',
      badgeVariant: 'default',
      value: netProfit.value,
      subtext: netProfit.subtext,
      subtextColor: 'text-success',
      icon: TrendingUp,
    },
    {
      id: 'kpi-low-stock',
      title: 'Critical Low Stock',
      badge: lowStockState.badge,
      badgeVariant: lowStockState.badgeVariant,
      value: lowStockState.value,
      valueColor: lowStockState.isDanger ? 'text-danger' : 'text-text-primary',
      subtext: lowStockState.subtext,
      subtextColor: lowStockState.subtextColor,
      icon: AlertTriangle,
      href: lowStockState.href,
      onClick: props.onLowStockClick,
      ariaLabel: `Critical Low Stock: ${lowStockState.value} ${lowStockState.subtext}. Click to view low-stock inventory catalog.`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((kpi) => {
        const borderClass = getCardBorderClass(kpi.badgeVariant);
        const baseClasses = `p-5 rounded-lg bg-bg-card border transition-all flex flex-col justify-between shadow-xs ${borderClass}`;

        if (kpi.href) {
          return (
            <Link
              key={kpi.id}
              href={kpi.href}
              onClick={kpi.onClick}
              aria-label={kpi.ariaLabel}
              className={`${baseClasses} cursor-pointer hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus:outline-none`}
            >
              <KpiCardInner kpi={kpi} />
            </Link>
          );
        }

        return (
          <div key={kpi.id} className={baseClasses}>
            <KpiCardInner kpi={kpi} />
          </div>
        );
      })}
    </div>
  );
}
