"use client";

import React, { useState } from "react";

interface DailyRevenueData {
  day: string;
  partsAmount: number;
  partsDisplay: string;
  laborAmount: number;
  laborDisplay: string;
  partsHeightPercent: number;
  laborHeightPercent: number;
}

const WEEKLY_REVENUE_DATA: DailyRevenueData[] = [
  {
    day: "Mon",
    partsAmount: 28500,
    partsDisplay: "₱28.5k",
    laborAmount: 12000,
    laborDisplay: "₱12.0k",
    partsHeightPercent: 60,
    laborHeightPercent: 35,
  },
  {
    day: "Tue",
    partsAmount: 34000,
    partsDisplay: "₱34.0k",
    laborAmount: 15500,
    laborDisplay: "₱15.5k",
    partsHeightPercent: 75,
    laborHeightPercent: 40,
  },
  {
    day: "Wed",
    partsAmount: 22100,
    partsDisplay: "₱22.1k",
    laborAmount: 10200,
    laborDisplay: "₱10.2k",
    partsHeightPercent: 50,
    laborHeightPercent: 30,
  },
  {
    day: "Thu",
    partsAmount: 41000,
    partsDisplay: "₱41.0k",
    laborAmount: 21400,
    laborDisplay: "₱21.4k",
    partsHeightPercent: 85,
    laborHeightPercent: 55,
  },
  {
    day: "Fri",
    partsAmount: 44500,
    partsDisplay: "₱44.5k",
    laborAmount: 24000,
    laborDisplay: "₱24.0k",
    partsHeightPercent: 90,
    laborHeightPercent: 60,
  },
  {
    day: "Sat",
    partsAmount: 48000,
    partsDisplay: "₱48.0k",
    laborAmount: 29500,
    laborDisplay: "₱29.5k",
    partsHeightPercent: 95,
    laborHeightPercent: 70,
  },
  {
    day: "Sun (Today)",
    partsAmount: 38200,
    partsDisplay: "₱38.2k",
    laborAmount: 19000,
    laborDisplay: "₱19.0k",
    partsHeightPercent: 80,
    laborHeightPercent: 50,
  },
];

export function RevenueComparisonChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(4); // Default tooltip on Friday as in screenshot
  const [hoveredType, setHoveredType] = useState<"parts" | "labor">("parts");
  const [filter, setFilter] = useState<"all" | "parts" | "labor">("all");

  return (
    <div className="bg-bg-card border border-border rounded-lg shadow-xs overflow-hidden flex flex-col justify-between">
      {/* Panel Card Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-bg-surface">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary">
          7-Day Revenue Comparison (Parts Sales vs Labor Services)
        </h3>
        <span className="px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-bg-muted text-text-secondary border border-border-subtle">
          Sept 22 - 28, 2026
        </span>
      </div>

      {/* Chart Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        {/* Bars Container */}
        <div className="h-52 sm:h-56 flex items-end gap-2 sm:gap-4 md:gap-6 pt-8 pb-2 border-b border-border relative">
          {WEEKLY_REVENUE_DATA.map((item, index) => {
            const isHovered = hoveredIndex === index;
            const showPartsTooltip = isHovered && hoveredType === "parts";
            const showLaborTooltip = isHovered && hoveredType === "labor";

            const isPartsVisible = filter === "all" || filter === "parts";
            const isLaborVisible = filter === "all" || filter === "labor";

            return (
              <div
                key={item.day}
                className="flex-1 flex gap-1 sm:gap-1.5 items-end h-full relative group"
                onMouseLeave={() => {
                  // Keep Friday selected if leaving the container, or keep state intact
                }}
              >
                {/* Motorcycle Parts Bar */}
                {isPartsVisible && (
                  <div
                    className="flex-1 bg-primary hover:bg-primary-hover transition-all duration-200 rounded-t-sm relative cursor-pointer"
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
                    className="flex-1 bg-info hover:bg-info/90 transition-all duration-200 rounded-t-sm relative cursor-pointer"
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
        <div className="flex justify-between items-center pt-2 text-[11px] sm:text-xs font-semibold text-text-muted">
          {WEEKLY_REVENUE_DATA.map((item) => (
            <span key={item.day} className="flex-1 text-center truncate px-0.5">
              {item.day}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 pt-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter(filter === "parts" ? "all" : "parts")}
            className={`flex items-center gap-2 transition-opacity cursor-pointer ${
              filter === "labor" ? "opacity-40" : "opacity-100"
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-xs bg-primary shrink-0" />
            <span className="text-text-primary hover:text-primary transition-colors">
              Motorcycle Parts Sales
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter(filter === "labor" ? "all" : "labor")}
            className={`flex items-center gap-2 transition-opacity cursor-pointer ${
              filter === "parts" ? "opacity-40" : "opacity-100"
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-xs bg-info shrink-0" />
            <span className="text-text-primary hover:text-info transition-colors">
              Repair Bay Labor Services
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
