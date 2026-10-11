import React from 'react';
import { Boxes, AlertTriangle, Layers } from 'lucide-react';
import { PesoIcon } from '@/components/icons/peso-icon';
import { CatalogStats, formatPeso } from '@/lib/inventory/catalog-filter';

interface InventoryStatsCardsProps {
  stats: CatalogStats;
}

function getBadgeStyle(badgeVariant?: string): string {
  if (badgeVariant === 'danger') {
    return 'bg-danger-light text-danger border border-danger/30';
  }
  if (badgeVariant === 'success') {
    return 'bg-success-light text-success border border-success/30';
  }
  return 'bg-bg-muted text-text-secondary border border-border-subtle';
}

export function InventoryStatsCards({ stats }: Readonly<InventoryStatsCardsProps>) {
  const cards = [
    {
      title: 'Total Active SKUs',
      badge: 'Catalog',
      badgeVariant: 'neutral' as const,
      value: stats.totalSkus.toLocaleString(),
      subtext: `${stats.categoriesCount} distinct categories`,
      icon: Boxes,
      iconColor: 'text-primary'
    },
    {
      title: 'Total Units on Hand',
      badge: 'Units',
      badgeVariant: 'neutral' as const,
      value: (stats.totalUnitsOnHand ?? 0).toLocaleString(),
      subtext: 'Cumulative physical on-hand units',
      icon: Layers,
      iconColor: 'text-primary'
    },
    {
      title: 'Critical Low Stock',
      badge: (stats.criticalLowStockCount ?? stats.lowStockCount) > 0 ? 'Urgent' : 'Optimal',
      badgeVariant: (stats.criticalLowStockCount ?? stats.lowStockCount) > 0 ? ('danger' as const) : ('success' as const),
      value: (stats.criticalLowStockCount ?? stats.lowStockCount).toString(),
      valueColor: (stats.criticalLowStockCount ?? stats.lowStockCount) > 0 ? 'text-danger' : 'text-success',
      subtext:
        (stats.criticalLowStockCount ?? stats.lowStockCount) > 0
          ? `${stats.criticalLowStockCount ?? stats.lowStockCount} items at or below threshold`
          : 'All items above minimum threshold',
      subtextColor: (stats.criticalLowStockCount ?? stats.lowStockCount) > 0 ? 'text-danger' : 'text-success',
      icon: AlertTriangle,
      iconColor: (stats.criticalLowStockCount ?? stats.lowStockCount) > 0 ? 'text-danger' : 'text-success'
    },
    {
      title: 'Total Inventory Valuation',
      badge: 'Valuation',
      badgeVariant: 'neutral' as const,
      value: formatPeso(stats.totalValuation),
      subtext: 'Accumulated retail floor stock',
      icon: PesoIcon,
      iconColor: 'text-success'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="p-5 rounded-lg bg-bg-card border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 shrink-0 ${card.iconColor}`} />
                <span className="text-xs font-semibold text-text-muted">
                  {card.title}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(
                  card.badgeVariant
                )}`}
              >
                {card.badge}
              </span>
            </div>

            <div>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  card.valueColor || 'text-text-primary'
                }`}
              >
                {card.value}
              </div>
              <div
                className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
                  card.subtextColor || 'text-text-secondary'
                }`}
              >
                <span>{card.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
