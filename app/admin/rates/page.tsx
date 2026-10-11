"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Tags,
  Plus,
  Search,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock
} from "lucide-react";
import {
  getAdminLaborServicesAction,
  createLaborServiceAction,
  updateLaborServiceAction,
  toggleServiceStatusAction,
  deleteLaborServiceAction
} from "@/lib/admin/service-actions";
import {
  getPricingRulesAction
} from "@/lib/admin/pricing-actions";
import { useLaborServicesRealtime } from "@/lib/hooks/use-labor-services-realtime";
import { LaborRatesTable } from "@/components/admin/rates/labor-rates-table";
import { EditServiceModal } from "@/components/admin/rates/edit-service-modal";
import { NewServiceModal } from "@/components/admin/rates/new-service-modal";
import { HourlyBenchmarkCard } from "@/components/admin/rates/hourly-benchmark-card";
import { GlobalMarkupCard } from "@/components/admin/rates/global-markup-card";
import { usePricingRulesRealtime } from "@/lib/hooks/use-pricing-rules-realtime";
import type { LaborService, CreateLaborServicePayload } from "@/lib/types/service";
import type { PricingRules } from "@/lib/types/pricing";

export default function AdminRatesPage() {
  const [services, setServices] = useState<LaborService[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRules | null>(null);
  const [hourlyRate, setHourlyRate] = useState<number>(450);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBayFilter, setSelectedBayFilter] = useState("ALL");
  const [editingService, setEditingService] = useState<LaborService | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Fetch services catalog
    getAdminLaborServicesAction()
      .then((data) => {
        if (isMounted) {
          setServices(data);
        }
      })
      .catch((err) => {
        console.error("[AdminRatesPage] Failed to load services:", err);
      });

    // Fetch pricing benchmark rules
    getPricingRulesAction()
      .then((rules) => {
        if (isMounted) {
          setPricingRules(rules);
          if (rules.hourlyLaborRate) {
            setHourlyRate(rules.hourlyLaborRate);
          }
        }
      })
      .catch((err) => {
        console.error("[AdminRatesPage] Failed to load pricing rules:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-terminal Realtime sync for labor services
  useLaborServicesRealtime({
    onInsert: (newService) => {
      setServices((prev) => {
        if (prev.some((s) => s.code === newService.code)) {
          return prev.map((s) => (s.code === newService.code ? newService : s));
        }
        return [...prev, newService];
      });
    },
    onUpdate: (updated) => {
      setServices((prev) =>
        prev.map((s) => (s.code === updated.code || s.id === updated.id ? updated : s))
      );
    },
    onDelete: (id, code) => {
      setServices((prev) => prev.filter((s) => s.code !== code && s.id !== id));
    }
  });

  // Multi-terminal Realtime sync for global pricing rules
  usePricingRulesRealtime({
    onUpdate: (updatedRules) => {
      setPricingRules(updatedRules);
      if (updatedRules.hourlyLaborRate) {
        setHourlyRate(updatedRules.hourlyLaborRate);
      }
      showNotification("Global pricing rules updated in realtime via Supabase broadcast");
    }
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Metrics calculation
  const totalCount = services.length;
  const activeCount = services.filter((s) => s.active !== false).length;
  const avgRate = useMemo(() => {
    if (services.length === 0) return 0;
    const sum = services.reduce((acc, s) => acc + s.rate, 0);
    return sum / services.length;
  }, [services]);

  // Filtering
  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((s) => {
      const matchesBay =
        selectedBayFilter === "ALL" ||
        s.bay.toLowerCase().includes(selectedBayFilter.toLowerCase());

      const matchesQuery =
        !q ||
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.bay.toLowerCase().includes(q);

      return matchesBay && matchesQuery;
    });
  }, [services, selectedBayFilter, searchQuery]);

  // Handlers
  const handleSaveRateUpdate = async (
    serviceId: string,
    updates: {
      name?: string;
      bay?: string;
      rate: number;
      duration: string;
      description?: string;
      reason: string;
    }
  ) => {
    const res = await updateLaborServiceAction(serviceId, {
      ...updates,
      userName: "Service Desk Manager"
    });

    if (res.success && res.data) {
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId || s.code === serviceId ? res.data! : s))
      );
      showNotification(`Updated rate for ${res.data.name} to ₱${res.data.rate.toFixed(2)}`);
      return true;
    }
    return false;
  };

  const handleCreateService = async (payload: CreateLaborServicePayload) => {
    const res = await createLaborServiceAction(payload);
    if (res.success && res.data) {
      setServices((prev) => [...prev, res.data!]);
      showNotification(`Registered new labor service: ${res.data.name}`);
      return true;
    }
    return false;
  };

  const handleToggleStatus = async (service: LaborService) => {
    const nextStatus = service.active === false;
    const idToUse = service.id || service.code;
    const res = await toggleServiceStatusAction(idToUse, nextStatus);
    if (res.success && res.data) {
      setServices((prev) =>
        prev.map((s) => (s.code === service.code ? res.data! : s))
      );
      showNotification(
        `${nextStatus ? "Restored" : "Archived"} service ${service.name}`
      );
    }
  };

  const handleDeleteService = async (service: LaborService) => {
    if (!confirm(`Are you sure you want to permanently delete "${service.name}" (${service.code})?`)) {
      return;
    }
    const idToUse = service.id || service.code;
    const res = await deleteLaborServiceAction(idToUse);
    if (res.success) {
      setServices((prev) => prev.filter((s) => s.code !== service.code && s.id !== service.id));
      showNotification(`Deleted service: ${service.name}`);
    }
  };

  return (
    <section id="view-pricing" className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success text-text-light text-xs font-bold shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shadow-xs">
            <Tags className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Pricing & Labor Rates Matrix
            </h2>
            <p className="text-xs text-text-secondary">
              Standardized flat-rate workshop labor schedules, repair bays, and live POS synchronization.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary-hover text-text-light shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Service</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-bg-surface border border-border rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-xs font-semibold">Total Services</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono text-text-primary">
            {totalCount}
          </div>
          <p className="text-[11px] text-text-secondary mt-1">
            Standard shop repair offerings
          </p>
        </div>

        <div className="p-4 bg-bg-surface border border-border rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-xs font-semibold">Active Services</span>
            <Activity className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-black font-mono text-success">
            {activeCount}
          </div>
          <p className="text-[11px] text-text-secondary mt-1">
            Available on Fast-Lane POS
          </p>
        </div>

        <div className="p-4 bg-bg-surface border border-border rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-xs font-semibold">Average Flat Rate</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono text-primary">
            ₱{avgRate.toFixed(2)}
          </div>
          <p className="text-[11px] text-text-secondary mt-1">
            Standard labor charge per ticket
          </p>
        </div>

        <div className="p-4 bg-bg-surface border border-border rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-xs font-semibold">Benchmark Hourly Rate</span>
            <Clock className="w-4 h-4 text-secondary" />
          </div>
          <div className="text-2xl font-black font-mono text-text-primary">
            ₱{hourlyRate.toFixed(2)}/hr
          </div>
          <p className="text-[11px] text-text-secondary mt-1">
            Shop baseline for dynamic bay jobs
          </p>
        </div>
      </div>

      {/* Global Parts Markup Rules Card */}
      <GlobalMarkupCard
        initialRules={pricingRules ?? undefined}
        onRulesUpdated={(updated) => {
          setPricingRules(updated);
          if (updated.hourlyLaborRate) {
            setHourlyRate(updated.hourlyLaborRate);
          }
          showNotification("Global pricing rules saved!");
        }}
      />

      {/* Hourly Labor Rate Benchmark & Dynamic Estimator */}
      <HourlyBenchmarkCard
        initialHourlyRate={hourlyRate}
        onRateUpdated={(newRate) => {
          setHourlyRate(newRate);
          showNotification(`Updated shop base hourly labor benchmark to ₱${newRate.toFixed(2)}/hr`);
        }}
      />

      {/* Flat-Rate Labor Schedule Matrix Panel */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Flat-Rate Labor Schedule Matrix
            </h3>
            <p className="text-xs text-text-secondary">
              Standardized repair bay schedule with assigned completion durations and flat fees.
            </p>
          </div>

          {/* Bay Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setSelectedBayFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedBayFilter === "ALL"
                  ? "bg-primary text-text-light shadow-xs"
                  : "bg-bg-base text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              All Repair Bays
            </button>
            {["Bay 1", "Bay 2", "Bay 3", "Bay 4"].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBayFilter(b)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedBayFilter === b
                    ? "bg-primary text-text-light shadow-xs"
                    : "bg-bg-base text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 bg-bg-surface/50 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative sm:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, or repair bay..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-primary outline-hidden"
            />
          </div>

          <div className="text-xs text-text-muted font-medium">
            Showing <span className="font-bold text-text-primary">{filteredServices.length}</span> of {totalCount} workshop services
          </div>
        </div>

        {/* Matrix Table */}
        <LaborRatesTable
          services={filteredServices}
          onEdit={(srv) => setEditingService(srv)}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteService}
        />
      </div>

      {/* Edit Modal */}
      <EditServiceModal
        isOpen={Boolean(editingService)}
        service={editingService}
        onClose={() => setEditingService(null)}
        onSave={handleSaveRateUpdate}
      />

      {/* New Service Modal */}
      <NewServiceModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateService}
      />
    </section>
  );
}
