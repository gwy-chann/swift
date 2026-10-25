"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, UserCheck, Layers } from "lucide-react";
import type { DetailedWorkOrder, WorkshopQueueSummary } from "@/lib/types/workshop";
import type { WorkOrderStatus } from "@/lib/types/service";
import { usePunchStore } from "@/lib/store/punch-store";
import {
  fetchWorkshopOrdersAction,
  updateWorkshopOrderStatusAction,
  claimWorkOrderAction,
  assignMechanicAction,
} from "@/lib/workshop/workshop-actions";
import { DANTE_REYES_PROFILE_ID } from "@/lib/workshop/workshop-mock-data";
import { WorkshopQueueHeader } from "./workshop-queue-header";
import { WorkOrderCard } from "./work-order-card";
import { WorkOrderDetailDrawer } from "./work-order-detail-drawer";
import { WorkshopEmptyState } from "./workshop-empty-state";
import { useExecutiveRealtime } from "@/lib/analytics/use-executive-realtime";

const STATUS_FILTER_LABELS: Record<string, string> = {
  ALL: "All States",
  "IN PROGRESS": "In Progress",
  PENDING_PARTS: "Waiting Parts",
  COMPLETED: "Completed",
  QUEUED: "Queued",
  CANCELLED: "Cancelled",
};

interface WorkshopQueueClientProps {
  initialOrders: DetailedWorkOrder[];
  isAdmin?: boolean;
}

export function WorkshopQueueClient({
  initialOrders,
  isAdmin: propIsAdmin,
}: Readonly<WorkshopQueueClientProps>) {
  const [orders, setOrders] = useState<DetailedWorkOrder[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"my-jobs" | "all-bays">("my-jobs");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | WorkOrderStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { currentStaff, currentStaffRole } = usePunchStore();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : currentStaffRole === "admin";
  const mechanicName = currentStaff || "Dante Reyes";
  const currentMechanicId = DANTE_REYES_PROFILE_ID;

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId || o.orderNumber === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Refresh Queue from Server
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetchWorkshopOrdersAction();
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error("[Workshop Queue] Failed to refresh queue:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Listen for local POS checkout events to immediately sync queue
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePosCheckout = () => {
      handleRefresh();
    };

    window.addEventListener("swift:pos:checkout", handlePosCheckout);
    window.addEventListener("swift:pos:workorder-created", handlePosCheckout);

    return () => {
      window.removeEventListener("swift:pos:checkout", handlePosCheckout);
      window.removeEventListener("swift:pos:workorder-created", handlePosCheckout);
    };
  }, [handleRefresh]);

  // Real-time synchronization subscription on Supabase
  useExecutiveRealtime({
    enabled: true,
    onWorkOrderChange: (payload) => {
      setOrders((prev) => {
        const exists = prev.some(
          (ord) => ord.id === payload.id || ord.orderNumber === payload.order_number
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawPayload = payload as any;

        if (exists) {
          return prev.map((ord) => {
            if (ord.id === payload.id || ord.orderNumber === payload.order_number) {
              return {
                ...ord,
                mechanicId: payload.mechanic_id !== undefined ? payload.mechanic_id : ord.mechanicId,
                mechanicName: rawPayload.mechanic_name ?? ord.mechanicName,
                status: payload.status ?? ord.status,
                startedAt: payload.started_at ?? ord.startedAt,
                completedAt: payload.completed_at ?? ord.completedAt,
                notes: payload.notes ?? ord.notes,
                customerPhone: rawPayload.customer_phone ?? rawPayload.customerPhone ?? ord.customerPhone,
                updatedAt: payload.updated_at || ord.updatedAt || new Date().toISOString(),
              };
            }
            return ord;
          });
        }

        // Auto-provisioned work order inserted via POS bridge (SIAA-100 / SIAA-101)
        const newOrder: DetailedWorkOrder = {
          id: payload.id,
          orderNumber: payload.order_number,
          bayId: payload.bay_id ?? null,
          bayName: rawPayload.service_bays?.name || rawPayload.bay_name || "Workshop Bay",
          customerName: payload.customer_name || "Walk-in Customer",
          customerPhone: rawPayload.customer_phone || rawPayload.customerPhone || "0917-000-0000",
          vehicleModel: payload.vehicle_model || "Motorcycle (General)",
          plateNumber: payload.plate_number || "FOR-REG",
          serviceCode: payload.service_code || "SRV-GEN-01",
          serviceName: payload.service_name || "Workshop Labor Service",
          mechanicId: payload.mechanic_id ?? null,
          mechanicName: rawPayload.mechanic_name || undefined,
          status: payload.status,
          estimatedDurationMinutes: payload.estimated_duration_minutes ?? 30,
          startedAt: payload.started_at ?? null,
          completedAt: payload.completed_at ?? null,
          notes: payload.notes ?? null,
          laborTasks: [
            {
              id: "1",
              description: `Execute ${payload.service_name || "scheduled repair service"}`,
              completed: false,
            },
          ],
          requiredParts: [],
          createdAt: payload.created_at || new Date().toISOString(),
          updatedAt: payload.updated_at || new Date().toISOString(),
        };

        return [newOrder, ...prev];
      });
    },
  });

  // Calculate Summary KPIs
  const summary: WorkshopQueueSummary = useMemo(() => {
    const activeJobs = orders.filter((o) => o.status === "IN PROGRESS" || o.status === "QUEUED" || o.status === "PENDING_PARTS");
    const myJobs = activeJobs.filter((o) => o.mechanicId === currentMechanicId || (!o.mechanicId && activeTab === "all-bays"));
    const pendingParts = orders.filter((o) => o.status === "PENDING_PARTS");
    const completedToday = orders.filter((o) => o.status === "COMPLETED");
    const activeBays = orders.filter((o) => o.status === "IN PROGRESS" || o.status === "PENDING_PARTS");

    return {
      activeJobsCount: activeJobs.length,
      myJobsCount: myJobs.length,
      pendingPartsCount: pendingParts.length,
      completedTodayCount: completedToday.length,
      activeBaysCount: Math.min(4, activeBays.length),
      totalBaysCount: 4,
    };
  }, [orders, currentMechanicId, activeTab]);

  // Filter Orders based on Tab, Status, and Search Query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Tab Segmentation
      if (activeTab === "my-jobs") {
        // Display orders assigned to current mechanic
        const isMine = order.mechanicId === currentMechanicId || order.mechanicName?.toLowerCase().includes("dante");
        if (!isMine) return false;
      }

      // 2. Status Filter
      if (selectedStatus !== "ALL" && order.status !== selectedStatus) {
        return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = order.plateNumber.toLowerCase().includes(q);
        const matchesModel = order.vehicleModel.toLowerCase().includes(q);
        const matchesOrder = order.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = order.customerName.toLowerCase().includes(q);
        const matchesService = order.serviceName.toLowerCase().includes(q);

        if (!matchesPlate && !matchesModel && !matchesOrder && !matchesCustomer && !matchesService) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, selectedStatus, searchQuery, currentMechanicId]);

  // Atomic Status Transition Handler
  async function handleStatusChange(orderId: string, newStatus: WorkOrderStatus) {
    setIsUpdating(true);
    const prevOrders = [...orders];
    const now = new Date().toISOString();

    // Optimistic UI Update
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: newStatus,
            startedAt: newStatus === "IN PROGRESS" && !ord.startedAt ? now : ord.startedAt,
            completedAt: newStatus === "COMPLETED" ? now : ord.completedAt,
            updatedAt: now,
          };
        }
        return ord;
      })
    );

    try {
      const res = await updateWorkshopOrderStatusAction(orderId, newStatus);
      if (!res.success) {
        console.warn("[Workshop Queue] Status update rejected, reverting:", res.error);
        setOrders(prevOrders);
      }
    } catch (err) {
      console.error("[Workshop Queue] Status update failed:", err);
      setOrders(prevOrders);
    } finally {
      setIsUpdating(false);
    }
  }

  // Admin Assign Mechanic Handler (SIAA-101 Scenario 3)
  const handleAssignMechanic = useCallback(
    async (orderId: string, mechId: string, mechName: string) => {
      setIsUpdating(true);
      try {
        const res = await assignMechanicAction(orderId, mechId, mechName);
        if (res.success && res.data) {
          setOrders((prev) =>
            prev.map((ord) => (ord.id === orderId || ord.orderNumber === orderId ? res.data! : ord))
          );
        }
      } catch (err) {
        console.error("[Workshop Queue] Failed to assign mechanic:", err);
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  // Claim Job Handler
  async function handleClaimJob(orderId: string) {
    setIsUpdating(true);
    try {
      const res = await claimWorkOrderAction(orderId, currentMechanicId, mechanicName, true);
      if (res.success && res.data) {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? (res.data as DetailedWorkOrder) : ord))
        );
      }
    } catch (err) {
      console.error("[Workshop Queue] Claim job failed:", err);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header & Metric Bar */}
      <WorkshopQueueHeader
        summary={summary}
        mechanicName={mechanicName}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Segmented View Tabs & Quick Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        {/* Segment Tabs: My Active Jobs vs Workshop Bay Queue */}
        <div className="flex items-center gap-1.5 p-1 bg-bg-surface border border-border rounded-lg shadow-xs self-start">
          <button
            type="button"
            onClick={() => setActiveTab("my-jobs")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "my-jobs"
                ? "bg-primary text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My Active Jobs</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "my-jobs" ? "bg-white/20 text-white" : "bg-bg-base text-text-muted"
              }`}
            >
              {summary.myJobsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all-bays")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "all-bays"
                ? "bg-primary text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workshop Bay Queue</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "all-bays" ? "bg-white/20 text-white" : "bg-bg-base text-text-muted"
              }`}
            >
              {orders.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plate, vehicle, or job #..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-focus transition-colors shadow-xs"
          />
        </div>
      </div>

      {/* Status Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-5 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted mr-1">Status:</span>

        {(["ALL", "QUEUED", "IN PROGRESS", "PENDING_PARTS", "COMPLETED"] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === st
                ? "bg-secondary text-white shadow-xs"
                : "bg-bg-surface border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            {STATUS_FILTER_LABELS[st] || st}
          </button>
        ))}
      </div>

      {/* Work Orders Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <WorkOrderCard
              key={order.id}
              order={order}
              currentMechanicId={currentMechanicId}
              onInspect={(ord) => setSelectedOrderId(ord.id)}
              onStatusChange={handleStatusChange}
              onClaimJob={handleClaimJob}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      ) : (
        <WorkshopEmptyState
          tab={activeTab}
          statusFilter={selectedStatus}
          onResetFilters={() => {
            setSelectedStatus("ALL");
            setSearchQuery("");
          }}
          onSwitchToAllBays={() => {
            setActiveTab("all-bays");
            setSelectedStatus("ALL");
          }}
        />
      )}

      {/* Inspect Work Order Detail Slide-Over Drawer */}
      <WorkOrderDetailDrawer
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdating}
        isAdmin={isAdmin}
        onAssignMechanic={handleAssignMechanic}
      />
    </div>
  );
}
