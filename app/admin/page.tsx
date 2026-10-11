import React from "react";
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import { RevenueComparisonChart } from "@/components/admin/revenue-comparison-chart";
import { ServiceBayStatusCard } from "@/components/admin/service-bay-status";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Welcome & Context Banner */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
          Operational Intelligence Dashboard
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Live workshop metrics, bay queue performance, and real-time revenue analytics.
        </p>
      </div>

      {/* 4 KPI Stat Cards Grid with Realtime POS Sales Subscription */}
      <AdminKpiGrid />

      {/* Dashboard Analytics & Service Bay Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueComparisonChart />
        </div>
        <div className="lg:col-span-1">
          <ServiceBayStatusCard />
        </div>
      </div>
    </div>
  );
}
