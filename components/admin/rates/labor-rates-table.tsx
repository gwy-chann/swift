"use client";

import React from "react";
import { Edit2, Power, Trash2, Clock, MapPin, CheckCircle, XCircle } from "lucide-react";
import type { LaborService } from "@/lib/types/service";

interface LaborRatesTableProps {
  readonly services: readonly LaborService[];
  readonly onEdit: (service: LaborService) => void;
  readonly onToggleStatus: (service: LaborService) => void;
  readonly onDelete: (service: LaborService) => void;
}

export function LaborRatesTable({
  services,
  onEdit,
  onToggleStatus,
  onDelete
}: Readonly<LaborRatesTableProps>) {
  if (services.length === 0) {
    return (
      <div className="p-8 bg-bg-card border border-border rounded-xl text-center">
        <p className="text-sm font-semibold text-text-primary">No workshop labor services found</p>
        <p className="text-xs text-text-muted mt-1">
          Try adjusting your search criteria or register a new labor service above.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-surface/50 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              <th className="py-3 px-4">Service Code</th>
              <th className="py-3 px-4">Service Title & Scope</th>
              <th className="py-3 px-4">Repair Bay</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4 text-right">Flat Rate</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {services.map((service) => {
              const isActive = service.active !== false;

              return (
                <tr
                  key={service.code}
                  className={`hover:bg-bg-hover/60 transition-colors ${
                    !isActive ? "opacity-60 bg-bg-muted/30" : ""
                  }`}
                >
                  {/* Service Code */}
                  <td className="py-3.5 px-4 font-mono font-bold text-text-primary whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-bg-base border border-border text-[11px]">
                      {service.code}
                    </span>
                  </td>

                  {/* Title & Description */}
                  <td className="py-3.5 px-4 min-w-50">
                    <div className="font-bold text-text-primary">{service.name}</div>
                    {service.description && (
                      <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                        {service.description}
                      </p>
                    )}
                  </td>

                  {/* Repair Bay */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-light text-primary text-[11px] font-medium border border-primary/20">
                      <MapPin className="w-3 h-3" />
                      <span>{service.bay}</span>
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary font-mono">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span>{service.duration.replace(" mins", "m").replace(" min", "m")}</span>
                    </span>
                  </td>

                  {/* Flat Rate */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span className="text-sm font-mono font-extrabold text-primary">
                      ₱{service.rate.toFixed(2)}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-light text-success border border-success/20">
                        <CheckCircle className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-muted text-text-muted border border-border">
                        <XCircle className="w-3 h-3" />
                        <span>Archived</span>
                      </span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(service)}
                        title="Edit rate & bay details"
                        className="p-1.5 rounded-lg bg-bg-base hover:bg-bg-hover text-text-secondary hover:text-primary border border-border transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(service)}
                        title={isActive ? "Archive service (hide from POS)" : "Restore service"}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isActive
                            ? "bg-bg-base hover:bg-bg-hover text-text-muted hover:text-danger border-border"
                            : "bg-success-light text-success border-success/20 hover:bg-success hover:text-text-light"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(service)}
                        title="Delete service permanently"
                        className="p-1.5 rounded-lg bg-bg-base hover:bg-danger-light text-text-muted hover:text-danger border border-border hover:border-danger/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
