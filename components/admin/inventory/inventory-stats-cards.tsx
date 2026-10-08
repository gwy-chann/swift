import React from 'react';
import { Boxes, AlertTriangle, Layers } from 'lucide-react';
import { PesoIcon } from '@/components/icons/peso-icon';
import { CatalogStats, formatPeso } from '@/lib/inventory/catalog-filter';

interface InventoryStatsCardsProps {
  stats: CatalogStats;
}

export function InventoryStatsCards({ stats }: InventoryStatsCardsProps) {
  const cards = [
    {
      title: 'Total Active SKUs',
      badge: 'Catalog',
      badgeVariant: 'neutral' as const,
      value: stats.totalSkus.toString(),
      subtext: `${stats.categoriesCount} distinct categories`,
      icon: Boxes,
      iconColor: 'text-primary'
    },
    {
      title: 'Restock Warnings',
      badge: stats.lowStockCount > 0 ? 'Urgent' : 'Optimal',
      badgeVariant: stats.lowStockCount > 0 ? ('danger' as const) : ('success' as const),
      value: stats.lowStockCount.toString(),
      valueColor: stats.lowStockCount > 0 ? 'text-danger' : 'text-success',
      subtext:
        stats.lowStockCount > 0
          ? `${stats.lowStockCount} items at or below threshold`
          : 'All items above minimum threshold',
      subtextColor: stats.lowStockCount > 0 ? 'text-danger' : 'text-success',
      icon: AlertTriangle,
      iconColor: stats.lowStockCount > 0 ? 'text-danger' : 'text-success'
    },
    {
      title: 'Total Retail Valuation',
      badge: 'On-Hand',
      badgeVariant: 'neutral' as const,
      value: formatPeso(stats.totalValuation),
      subtext: 'Accumulated retail floor stock',
      icon: PesoIcon,
      iconColor: 'text-success'
    },
    {
      title: 'Stock Health',
      badge: stats.outOfStockCount > 0 ? 'Depleted' : 'Healthy',
      badgeVariant: stats.outOfStockCount > 0 ? ('danger' as const) : ('neutral' as const),
      value: stats.outOfStockCount > 0 ? `${stats.outOfStockCount} OOS` : '100% In Stock',
      valueColor: stats.outOfStockCount > 0 ? 'text-danger' : 'text-text-primary',
      subtext:
        stats.outOfStockCount > 0
          ? 'Requires immediate purchase order'
          : 'Zero stockouts detected',
      icon: Layers,
      iconColor: stats.outOfStockCount > 0 ? 'text-danger' : 'text-text-muted'
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
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  card.badgeVariant === 'danger'
                    ? 'bg-danger-light text-danger border border-danger/30'
                    : card.badgeVariant === 'success'
                    ? 'bg-success-light text-success border border-success/30'
                    : 'bg-bg-muted text-text-secondary border border-border-subtle'
                }`}
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
