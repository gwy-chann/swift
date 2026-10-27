'use client';

import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import type { AdminMotorRepairItem, RepairStageBadge } from '@/lib/repairs/repairs-contracts';
import { TablePagination, usePagination } from '@/components/common/table-pagination';

interface RepairsTableProps {
  items: AdminMotorRepairItem[];
  onSelect: (item: AdminMotorRepairItem) => void;
}

function getBadgePill(badge: RepairStageBadge) {
  switch (badge) {
    case 'In Progress':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'Waiting for Parts':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'Ready for Release':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'Pending':
    default:
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }
}

export function RepairsTable({ items, onSelect }: Readonly<RepairsTableProps>) {
  const pagination = usePagination(items, 10);
  if (items.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-12 text-center text-text-muted">
        No active repairs matching current filter criteria.
      </div>
    );
  }

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-base/80 border-b border-border-subtle text-xs font-bold text-text-muted uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3">Vehicle / Plate</th>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Service & Bay</th>
              <th scope="col" className="px-4 py-3">Assigned Mechanic</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Elapsed Time</th>
              <th scope="col" className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/60">
            {pagination.paginatedItems.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                className="hover:bg-bg-base/50 transition-colors cursor-pointer group"
              >
                {/* Vehicle / Plate */}
                <td className="px-4 py-3.5">
                  <div className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    {item.plateNumber}
                  </div>
                  <div className="text-xs text-text-muted">{item.vehicleModel}</div>
                  <div className="text-[10px] font-mono text-text-muted mt-0.5">{item.chassisNumber}</div>
                </td>

                {/* Customer */}
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-text-primary">{item.customerName}</div>
                  <div className="text-xs text-text-muted">{item.customerPhone || 'N/A'}</div>
                </td>

                {/* Service & Bay */}
                <td className="px-4 py-3.5">
                  <div className="font-medium text-text-primary line-clamp-1">{item.serviceName}</div>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-bg-base border border-border-subtle text-text-secondary">
                    {item.bayName || 'Unassigned Bay'}
                  </span>
                </td>

                {/* Mechanic */}
                <td className="px-4 py-3.5">
                  {item.mechanicName ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                        {item.mechanicName.charAt(0)}
                      </div>
                      <span className="font-semibold text-text-primary text-xs">{item.mechanicName}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Unassigned
                    </span>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getBadgePill(item.stageBadge)}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {item.stageBadge}
                  </span>
                </td>

                {/* Elapsed Time */}
                <td className="px-4 py-3.5 text-right font-medium text-text-primary text-xs">
                  <div className="flex items-center justify-end gap-1">
                    <Clock className="w-3.5 h-3.5 text-text-muted" />
                    <span>{item.elapsedMinutes}m</span>
                  </div>
                  <div className="text-[10px] text-text-muted">
                    Est: {item.estimatedDurationMinutes}m
                  </div>
                </td>

                {/* Inspect Action */}
                <td className="px-4 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                    className="p-1.5 rounded-md hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                    title="Inspect Repair Details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
        itemName="repairs"
      />
    </div>
  );
}
