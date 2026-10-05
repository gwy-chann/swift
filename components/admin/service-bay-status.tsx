"use client";

import React from "react";

interface ServiceBayItem {
  id: string;
  bayName: string;
  status: "IN PROGRESS" | "QUEUED" | "AVAILABLE" | "COMPLETED";
  vehicleService: string;
  mechanicInfo: string;
}

const SERVICE_BAYS_DATA: ServiceBayItem[] = [
  {
    id: "bay-1",
    bayName: "Bay 1 (Quick Bay)",
    status: "IN PROGRESS",
    vehicleService: "Yamaha NMAX • Oil Change + Brake Pads",
    mechanicInfo: "Mechanic: Dante Reyes (~10 mins left)",
  },
  {
    id: "bay-2",
    bayName: "Bay 2 (Scooter Bay)",
    status: "IN PROGRESS",
    vehicleService: "Honda Click 150i • Full CVT Overhaul",
    mechanicInfo: "Mechanic: Alex Lim (~25 mins left)",
  },
  {
    id: "bay-3",
    bayName: "Bay 3 (Mechanical Bay)",
    status: "QUEUED",
    vehicleService: "Suzuki Raider 150 Fi • Clutch Replacement",
    mechanicInfo: "Waiting for Bay clearance",
  },
];

export function ServiceBayStatusCard() {
  return (
    <div className="bg-bg-card border border-border rounded-lg shadow-xs overflow-hidden flex flex-col justify-between">
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
        {SERVICE_BAYS_DATA.map((bay) => {
          const isInProgress = bay.status === "IN PROGRESS";

          return (
            <div
              key={bay.id}
              className="px-4 sm:px-5 py-3.5 hover:bg-bg-hover transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-xs sm:text-sm font-bold text-text-primary">
                  {bay.bayName}
                </strong>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isInProgress
                      ? "bg-accent-light text-accent border border-accent/30"
                      : "bg-bg-muted text-text-secondary border border-border-subtle"
                  }`}
                >
                  {bay.status}
                </span>
              </div>

              <div className="text-xs text-text-muted mt-1 font-medium">
                {bay.vehicleService}
              </div>

              <div className="text-xs text-text-secondary mt-0.5 font-medium">
                {bay.mechanicInfo}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
