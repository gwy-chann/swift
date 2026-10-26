"use client";

import React, { useState } from "react";
import { useExecutiveRealtime } from "@/lib/analytics/use-executive-realtime";
import {
  normalizeRevenueTrend,
  INITIAL_WEEKLY_DATA,
  type DailyRevenueData,
} from "@/lib/analytics/revenue-trend-engine";
import type { WeeklyRevenueData, RevenueTrendDay } from "@/lib/types/analytics";

export type { DailyRevenueData };
export { INITIAL_WEEKLY_DATA };

export interface RevenueComparisonChartProps {
  /** Optional custom or dynamic weekly data (pre-computed or from server/RPC) */
  data?: DailyRevenueData[] | { days: (DailyRevenueData | RevenueTrendDay)[] } | WeeklyRevenueData;
  /** Server-provided weekly revenue trend dataset from analytics RPCs */
  initialWeeklyData?: WeeklyRevenueData;
  /** Optional date range header text (e.g. 'Sept 22 - 28, 2026') */
  dateRange?: string;
  /** Realtime incremental sales amount for parts */
  todayPartsIncrement?: number;
  /** Realtime incremental sales amount for labor */
  todayLaborIncrement?: number;
  /** Initial filter state */
  initialFilter?: "all" | "parts" | "labor";
  /** Optional container class name */
  className?: string;
}

function resolveRawDataset(
  data?: DailyRevenueData[] | { days: (DailyRevenueData | RevenueTrendDay)[] } | WeeklyRevenueData,
  initialWeeklyData?: WeeklyRevenueData
): DailyRevenueData[] {
  const source = initialWeeklyData || data;
  if (!source) {
    return INITIAL_WEEKLY_DATA;
  }
  if (Array.isArray(source)) {
    return source as DailyRevenueData[];
  }
  if ("days" in source && Array.isArray(source.days)) {
    return (source.days as Array<DailyRevenueData | RevenueTrendDay>).map((d) => {
      if ("day_label" in d) {
        return {
          day: d.day_label,
          date: d.date,
          partsAmount: d.parts_amount,
          partsDisplay: d.parts_display || `₱${(d.parts_amount / 1000).toFixed(1)}k`,
          laborAmount: d.labor_amount,
          laborDisplay: d.labor_display || `₱${(d.labor_amount / 1000).toFixed(1)}k`,
          partsHeightPercent: d.parts_height_percent,
          laborHeightPercent: d.labor_height_percent,
        };
      }
      return d as DailyRevenueData;
    });
  }
  return INITIAL_WEEKLY_DATA;
}

export function RevenueComparisonChart({
  data,
  initialWeeklyData,
  dateRange,
  todayPartsIncrement = 0,
  todayLaborIncrement = 0,
  initialFilter = "all",
  className = "",
}: RevenueComparisonChartProps = {}) {
  const [internalPartsIncrement, setInternalPartsIncrement] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(4); // Default tooltip on Friday
  const [hoveredType, setHoveredType] = useState<"parts" | "labor">("parts");
  const [filter, setFilter] = useState<"all" | "parts" | "labor">(initialFilter);

  // Realtime hook for standalone mode
  useExecutiveRealtime({
    onTransaction: (tx) => {
      setInternalPartsIncrement((prev) => prev + (tx.total_due || 0));
    },
  });

  const effectivePartsIncrement = todayPartsIncrement || internalPartsIncrement;

  // Resolve base array
  const rawDataset = resolveRawDataset(data, initialWeeklyData);

  // Compute proportional heights, currency labels, and header badge via pure engine
  const normalizedWeekly = normalizeRevenueTrend(rawDataset, {
    todayPartsIncrement: effectivePartsIncrement,
    todayLaborIncrement,
    dateRangeLabel: dateRange,
  });

  const weeklyData = normalizedWeekly.days;

  return (
    <div
      className={`bg-bg-card border border-border rounded-lg shadow-xs overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Panel Card Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-bg-surface">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary">
          7-Day Revenue Comparison (Parts Sales vs Labor Services)
        </h3>
      </div>

      {/* Chart Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        {/* Bars Container */}
        <div className="chart-container h-52 sm:h-56 flex items-end gap-2 sm:gap-4 md:gap-6 pt-8 pb-2 border-b border-border relative">
          {weeklyData.map((item, index) => {
            const isHovered = hoveredIndex === index;
            const showPartsTooltip = isHovered && hoveredType === "parts";
            const showLaborTooltip = isHovered && hoveredType === "labor";

            const isPartsVisible = filter === "all" || filter === "parts";
            const isLaborVisible = filter === "all" || filter === "labor";

            return (
              <div
                key={item.day}
                className="chart-bar-group flex-1 flex gap-1 sm:gap-1.5 items-end h-full relative group"
              >
                {/* Motorcycle Parts Bar */}
                {isPartsVisible && (
                  <div
                    role="graphics-symbol"
                    aria-label={`Motorcycle Parts Sales for ${item.day}: ${item.partsDisplay}`}
                    data-val={item.partsDisplay}
                    className="chart-bar bar-parts flex-1 bg-primary hover:bg-primary-hover transition-all duration-200 rounded-t-sm relative cursor-pointer"
                    style={{ height: `${item.partsHeightPercent}%` }}
                    onMouseEnter={() => {
                      setHoveredIndex(index);
                      setHoveredType("parts");
                    }}
                  >
                    {/* Tooltip */}
                    {showPartsTooltip && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-primary text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap z-20 pointer-events-none animate-fadeIn">
                        {item.partsDisplay}
                      </div>
                    )}
                  </div>
                )}

                {/* Repair Bay Labor Bar */}
                {isLaborVisible && (
                  <div
                    role="graphics-symbol"
                    aria-label={`Repair Bay Labor Services for ${item.day}: ${item.laborDisplay}`}
                    data-val={item.laborDisplay}
                    className="chart-bar bar-labor flex-1 bg-info hover:bg-info/90 transition-all duration-200 rounded-t-sm relative cursor-pointer"
                    style={{ height: `${item.laborHeightPercent}%` }}
                    onMouseEnter={() => {
                      setHoveredIndex(index);
                      setHoveredType("labor");
                    }}
                  >
                    {/* Tooltip */}
                    {showLaborTooltip && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-primary text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap z-20 pointer-events-none animate-fadeIn">
                        {item.laborDisplay}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="chart-x-labels flex justify-between items-center pt-2 text-[11px] sm:text-xs font-semibold text-text-muted">
          {weeklyData.map((item) => (
            <span key={item.day} className="flex-1 text-center truncate px-0.5">
              {item.day}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="chart-legend flex flex-wrap items-center gap-4 sm:gap-6 mt-4 pt-2 text-xs font-semibold">
          <button
            type="button"
            aria-pressed={filter === "all" || filter === "parts"}
            onClick={() => setFilter(filter === "parts" ? "all" : "parts")}
            className={`flex items-center gap-2 transition-opacity cursor-pointer ${
              filter === "labor" ? "opacity-40" : "opacity-100"
            }`}
          >
            <div className="legend-dot bar-parts w-2.5 h-2.5 rounded-xs bg-primary shrink-0" />
            <span className="text-text-primary hover:text-primary transition-colors">
              Motorcycle Parts Sales
            </span>
          </button>

          <button
            type="button"
            aria-pressed={filter === "all" || filter === "labor"}
            onClick={() => setFilter(filter === "labor" ? "all" : "labor")}
            className={`flex items-center gap-2 transition-opacity cursor-pointer ${
              filter === "parts" ? "opacity-40" : "opacity-100"
            }`}
          >
            <div className="legend-dot bar-labor w-2.5 h-2.5 rounded-xs bg-info shrink-0" />
            <span className="text-text-primary hover:text-info transition-colors">
              Repair Bay Labor Services
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
