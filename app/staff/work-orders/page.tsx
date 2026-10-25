import React from "react";
import { Metadata } from "next";
import { fetchWorkshopOrdersAction } from "@/lib/workshop/workshop-actions";
import { INITIAL_MOCK_WORK_ORDERS } from "@/lib/workshop/workshop-mock-data";
import { WorkshopQueueClient } from "@/components/staff/workshop/workshop-queue-client";

export const metadata: Metadata = {
  title: "SWIFT - Dedicated Mechanic Workshop Queue & Jobs",
  description: "Live workshop repair queue, technician job progression, parts inventory check and service bay status.",
};

export default async function StaffWorkOrdersPage() {
  const result = await fetchWorkshopOrdersAction();
  const initialOrders = result.success && result.data ? result.data : INITIAL_MOCK_WORK_ORDERS;

  return <WorkshopQueueClient initialOrders={initialOrders} />;
}
