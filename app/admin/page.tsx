import React from "react";
import { AdminDashboardClient } from "./admin-dashboard-client";
import {
  getExecutiveKpisAction,
  getRevenueTrendAction,
  getServiceBayStatusAction,
} from "@/lib/analytics/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [kpis, trend, bays] = await Promise.all([
    getExecutiveKpisAction(),
    getRevenueTrendAction(),
    getServiceBayStatusAction(),
  ]);

  return (
    <AdminDashboardClient
      initialKpis={kpis}
      initialRevenueTrend={trend}
      initialServiceBays={bays}
    />
  );
}
