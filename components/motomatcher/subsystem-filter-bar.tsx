"use client";

import React from "react";
import { Filter } from "lucide-react";
import { SUBSYSTEM_CATEGORIES } from "@/lib/motomatcher/subsystem-filter";

export interface SubsystemFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  includeUniversal: boolean;
  onToggleUniversal: (include: boolean) => void;
  totalMatches?: number;
  oemCount?: number;
  aftermarketCount?: number;
  className?: string;
}

export function SubsystemFilterBar({
  selectedCategory,
  onSelectCategory,
  includeUniversal,
  onToggleUniversal,
  totalMatches,
  oemCount,
  aftermarketCount,
  className = "",
}: SubsystemFilterBarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Subsystem category and fitment filters"
      className={`p-3 bg-bg-surface border border-border rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <Filter className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Subsystem:
        </span>
        {totalMatches !== undefined && (
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary border border-primary/20">
            {totalMatches} {totalMatches === 1 ? "match" : "matches"}
          </span>
        )}
        {oemCount !== undefined && aftermarketCount !== undefined && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-text-muted ml-1">
            <span>OEM: <strong className="text-primary font-mono">{oemCount}</strong></span>
            <span>•</span>
            <span>Aftermarket: <strong className="text-secondary font-mono">{aftermarketCount}</strong></span>
          </span>
        )}
      </div>

      {/* Category Pills Strip */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 flex-1 min-w-0"
        role="radiogroup"
        aria-label="Subsystem Category Filter"
      >
        {SUBSYSTEM_CATEGORIES.map((cat) => {
          const isActive = selectedCategory.toUpperCase() === cat.id.toUpperCase();
          return (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-primary/50"
              }`}
            >
              {cat.shortLabel || cat.label}
            </button>
          );
        })}
      </div>

      {/* Universal Parts Visibility Toggle */}
      <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
        <button
          type="button"
          role="switch"
          aria-checked={includeUniversal}
          onClick={() => onToggleUniversal(!includeUniversal)}
          className="flex items-center gap-2.5 cursor-pointer group select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
        >
          <div
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
              includeUniversal ? "bg-primary" : "bg-bg-muted border border-border"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                includeUniversal ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
              Include Universal
            </span>
            <span className="text-[10px] text-text-muted">
              Multi-fit parts
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
