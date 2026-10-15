"use client";

import React, { useState } from "react";
import type { WorkOrderStatus } from "@/lib/types/service";
import { useExecutiveRealtime } from "@/lib/analytics/use-executive-realtime";

export interface ServiceBayDisplayItem {
  id: string;
  bayName: string;
  status: WorkOrderStatus;
  vehicleService: string;
  mechanicInfo: string;
}

const DEFAULT_SERVICE_BAYS: ServiceBayDisplayItem[] = [
  {
    id: "f0000000-0000-0000-0000-000000000001",
    bayName: "Bay 1 (Quick Bay)",
    status: "IN PROGRESS",
    vehicleService: "Yamaha NMAX 155 • Oil Change + Brake Pads",
    mechanicInfo: "Mechanic: Dante Reyes (~10 mins left)",
  },
  {
    id: "f0000000-0000-0000-0000-000000000002",
    bayName: "Bay 2 (Scooter Bay)",
    status: "IN PROGRESS",
    vehicleService: "Honda Click 150i • Full CVT Overhaul",
    mechanicInfo: "Mechanic: Alex Lim (~25 mins left)",
  },
  {
    id: "f0000000-0000-0000-0000-000000000003",
    bayName: "Bay 3 (Mechanical Bay)",
    status: "QUEUED",
    vehicleService: "Suzuki Raider 150 Fi • Clutch Replacement",
    mechanicInfo: "Waiting for Bay clearance",
  },
];

function getMechanicStatusSuffix(status: string): string {
  if (status === 'COMPLETED') {
    return 'Ready for pickup';
  }
  if (status === 'PENDING_PARTS') {
    return 'Waiting for counter parts';
  }
  return 'In Progress';
}

interface ServiceBayStatusCardProps {
  bays?: ServiceBayDisplayItem[];
}

export function ServiceBayStatusCard({ bays: initialBays }: ServiceBayStatusCardProps = {}) {
  const [internalBays, setInternalBays] = useState<ServiceBayDisplayItem[]>(
    initialBays || DEFAULT_SERVICE_BAYS
  );

  const isControlled = initialBays !== undefined;

  // Realtime hook subscription for standalone mode
  useExecutiveRealtime({
    enabled: !isControlled,
    onWorkOrderChange: (wo) => {
      setInternalBays((prev) =>
        prev.map((bay, idx) => {
          // If work order specifies bay_id or matches first bay
          const isTargetBay = wo.bay_id ? bay.id === wo.bay_id : idx === 0;
          if (isTargetBay) {
            const statusSuffix = getMechanicStatusSuffix(wo.status);
            return {
              ...bay,
              status: wo.status,
              vehicleService: `${wo.vehicle_model} • ${wo.service_name}`,
              mechanicInfo: `Mechanic: Dante Reyes (${statusSuffix})`,
            };
          }
          return bay;
        })
      );
    },
  });

  const bays = isControlled ? initialBays : internalBays;

  const getStatusBadgeClass = (status: WorkOrderStatus) => {
    switch (status) {
      case "IN PROGRESS":
        return "bg-accent-light text-accent border border-accent/30";
      case "COMPLETED":
        return "bg-success-light text-success border border-success/30";
      case "PENDING_PARTS":
        return "bg-accent-light text-accent border border-accent/30";
      case "CANCELLED":
        return "bg-danger-light text-danger border border-danger/30";
      case "QUEUED":
      default:
        return "bg-bg-muted text-text-secondary border border-border-subtle";
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-lg shadow-xs overflow-hidden flex flex-col justify-between min-h-[300px]">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between gap-2 bg-bg-surface">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary">
          Service Bay Status
        </h3>
        <span className="px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-success-light text-success border border-success/30">
          4 Bays Active
        </span>
      </div>

      {/* Body List */}
      <div className="divide-y divide-border flex-1 flex flex-col justify-around">
        {bays.map((bay) => (
          <div
            key={bay.id}
            className="px-4 sm:px-5 py-3.5 hover:bg-bg-hover transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="text-xs sm:text-sm font-bold text-text-primary truncate">
                {bay.bayName}
              </strong>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all duration-200 shrink-0 ${getStatusBadgeClass(
                  bay.status
                )}`}
              >
                {bay.status}
              </span>
            </div>

            <div className="text-xs text-text-muted mt-1 font-medium truncate">
              {bay.vehicleService}
            </div>

            <div className="text-xs text-text-secondary mt-0.5 font-medium truncate">
              {bay.mechanicInfo}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
