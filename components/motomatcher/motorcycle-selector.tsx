"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, X, Bike, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import type { MotorcycleModelRecord } from "@/lib/types/product";
import {
  matchesMotorcycleFilter,
  POPULAR_PHILIPPINE_MAKES,
} from "@/lib/motomatcher/motorcycle-filter";

export interface MotorcycleSelectorProps {
  /**
   * Available list of motorcycle platform models.
   */
  models: MotorcycleModelRecord[];
  /**
   * Currently active selected model ID (optional controlled state).
   */
  selectedModelId?: string | null;
  /**
   * Selection callback fired whenever the clerk selects a model or clears it.
   */
  onSelectModel: (model: MotorcycleModelRecord | null) => void;
  /**
   * Callback fired when clicking the Universal / Multi-Fit parts action.
   */
  onSelectUniversal?: () => void;
  /**
   * Compact density rendering for tight floor terminal layouts.
   */
  compact?: boolean;
  /**
   * Additional wrapper class name.
   */
  className?: string;
  /**
   * Header title override.
   */
  title?: string;
  /**
   * Header subtitle override.
   */
  subtitle?: string;
}

export function MotorcycleSelector({
  models,
  selectedModelId,
  onSelectModel,
  onSelectUniversal,
  compact = false,
  className = "",
  title = "Select Motorcycle Make, Model & Displacement",
  subtitle = "Filter 100% verified motorcycle parts and compare OEM vs aftermarket compatibility.",
}: MotorcycleSelectorProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    selectedModelId ?? (models.length > 0 ? models[0].id : null)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState<string>("ALL");

  // Keep internal selected id in sync if controlled prop is provided
  useEffect(() => {
    if (selectedModelId !== undefined) {
      setInternalSelectedId(selectedModelId);
    }
  }, [selectedModelId]);

  // Set default selection to first model upon mounting if none selected
  useEffect(() => {
    if (!internalSelectedId && models.length > 0) {
      const defaultModel = models[0];
      setInternalSelectedId(defaultModel.id);
      onSelectModel(defaultModel);
    }
  }, [models, internalSelectedId, onSelectModel]);

  // Instant in-memory filtering (< 50ms)
  const filteredModels = useMemo(() => {
    return models.filter((m) =>
      matchesMotorcycleFilter(m, searchQuery, selectedMake, "ALL")
    );
  }, [models, searchQuery, selectedMake]);

  // Handle card selection
  const handleSelectCard = useCallback(
    (model: MotorcycleModelRecord) => {
      setInternalSelectedId(model.id);
      onSelectModel(model);
    },
    [onSelectModel]
  );

  // Handle brand pill click
  const handleMakeClick = (make: string) => {
    setSelectedMake(make);
    if (make === "Universal" && onSelectUniversal) {
      onSelectUniversal();
    }
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Keyboard navigation support for accessible cards
  const handleCardKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    model: MotorcycleModelRecord
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectCard(model);
    }
  };

  return (
    <div
      className={`bg-bg-surface border border-border rounded-xl shadow-xs p-4 sm:p-5 space-y-4 ${className}`}
      data-testid="motorcycle-selector"
    >
      {/* Header & Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-text-secondary line-clamp-1">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Count Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-semibold text-text-muted bg-bg-card border border-border px-2.5 py-1 rounded-full">
            {filteredModels.length} of {models.length} Platforms
          </span>
        </div>
      </div>

      {/* Search Input Bar & Brand Filter Pills */}
      <div className="space-y-2.5 pt-1">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            role="searchbox"
            aria-label="Search motorcycle models"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search motorcycle model or displacement (e.g., "NMAX", "Click 150", "ADV", "Raider", "155")...'
            className="w-full pl-9 pr-9 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted outline-hidden focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search input"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Brand Filter Pills */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar"
          role="tablist"
          aria-label="Filter by motorcycle brand"
        >
          {POPULAR_PHILIPPINE_MAKES.map((brand) => {
            const isActive = selectedMake === brand;
            return (
              <button
                key={brand}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleMakeClick(brand)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-primary/50"
                }`}
              >
                {brand === "ALL"
                  ? "All Brands"
                  : brand === "Universal"
                  ? "Universal / Multi-Fit"
                  : brand}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Selection Grid */}
      {filteredModels.length > 0 ? (
        <div
          role="radiogroup"
          aria-label="Motorcycle Models"
          className={`grid gap-2.5 sm:gap-3 ${
            compact
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          }`}
        >
          {filteredModels.map((model) => {
            const isSelected = internalSelectedId === model.id;
            return (
              <div
                key={model.id}
                role="radio"
                tabIndex={0}
                aria-checked={isSelected}
                aria-label={`${model.make} ${model.model} ${model.displacement_cc}cc`}
                onClick={() => handleSelectCard(model)}
                onKeyDown={(e) => handleCardKeyDown(e, model)}
                className={`group relative p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "border-primary bg-primary-light text-primary shadow-xs ring-1 ring-primary/20"
                    : "border-border bg-bg-card hover:border-primary/60 hover:bg-bg-card/80 text-text-primary"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                        isSelected ? "text-primary" : "text-text-muted group-hover:text-primary transition-colors"
                      }`}
                    >
                      {model.make} • {model.category}
                    </span>
                    <h4 className="text-xs font-bold text-text-primary truncate">
                      {model.model}
                    </h4>
                    <span className="text-[11px] text-text-muted font-mono block">
                      {model.displacement_cc}cc • {model.year_start}
                      {model.year_end ? `-${model.year_end}` : "+"}
                    </span>
                  </div>

                  {/* Active Indicator Icon */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                      isSelected
                        ? "bg-primary text-white scale-100"
                        : "bg-bg-input text-text-muted scale-95 opacity-50 group-hover:opacity-100"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State Handling */
        <div
          className="p-6 bg-bg-card border border-border border-dashed rounded-xl text-center space-y-3 animate-in fade-in duration-200"
          data-testid="motorcycle-selector-empty"
        >
          <div className="w-10 h-10 rounded-full bg-bg-input text-text-muted flex items-center justify-center mx-auto">
            <Bike className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-text-primary">
              No matching motorcycle model found
            </h4>
            <p className="text-[11px] text-text-secondary max-w-sm mx-auto">
              We couldn&apos;t find any motorcycle platform matching &ldquo;{searchQuery}&rdquo;.
              Try adjusting your search keywords or explore multi-fit universal parts.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-bg-surface border border-border text-text-primary hover:border-primary transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-text-muted" />
              Clear Search
            </button>
            {onSelectUniversal && (
              <button
                type="button"
                onClick={onSelectUniversal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3 h-3" />
                View Universal Parts
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
