import React from "react";
import { AdminReportsClient } from "./admin-reports-client";
import { getCategoryPnlAction } from "@/lib/analytics/actions";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const initialPnlData = await getCategoryPnlAction({ period: "daily" });

  return (
    <AdminReportsClient
      initialPnlData={initialPnlData}
      initialPeriod="daily"
    />
  );
}
