import React from "react";
import {
  TrendingUp,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { PesoIcon } from "@/components/icons/peso-icon";

import { RevenueComparisonChart } from "@/components/admin/revenue-comparison-chart";
import { ServiceBayStatusCard } from "@/components/admin/service-bay-status";

export default function AdminDashboardPage() {
  const kpiCards = [
    {
      title: "Gross Revenue",
      badge: "Today",
      value: "₱45,230.00",
      subtext: "+14.2% vs yesterday",
      subtextColor: "text-success",
      icon: PesoIcon,
    },
    {
      title: "Work Orders Queue",
      badge: "Service Bay",
      value: "8 Active",
      subtext: "3 Pending Parts Assembly",
      subtextColor: "text-accent",
      icon: Wrench,
    },
    {
      title: "Net Profit Margin",
      badge: "This Month",
      value: "34.8%",
      subtext: "₱182,400.00 Gross Profit",
      subtextColor: "text-success",
      icon: TrendingUp,
    },
    {
      title: "Critical Low Stock",
      badge: "Action Req",
      badgeVariant: "danger",
      value: "3 SKUs",
      valueColor: "text-danger",
      subtext: "Below threshold limit",
      subtextColor: "text-text-muted",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Welcome & Context Banner */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
          Operational Intelligence Dashboard
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Live workshop metrics, bay queue performance, and revenue analytics.
        </p>
      </div>

      {/* 4 KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="p-5 rounded-lg bg-bg-card border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-xs font-semibold text-text-muted">
                    {kpi.title}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    kpi.badgeVariant === "danger"
                      ? "bg-danger-light text-danger border border-danger/30"
                      : "bg-bg-muted text-text-secondary border border-border-subtle"
                  }`}
                >
                  {kpi.badge}
                </span>
              </div>

              <div>
                <div
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    kpi.valueColor || "text-text-primary"
                  }`}
                >
                  {kpi.value}
                </div>
                <div
                  className={`text-xs font-semibold mt-1 flex items-center gap-1 ${kpi.subtextColor}`}
                >
                  <span>{kpi.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
