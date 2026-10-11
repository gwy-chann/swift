import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { getServerSession, evaluateRouteAccess } from "@/lib/auth/session-guards";

export const metadata: Metadata = {
  title: "SWIFT - Admin Management Portal",
  description: "Executive Management Portal for Inventory, POS, MotoMatcher & Reports",
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const decision = evaluateRouteAccess("/admin", session);
  if (decision.action === "REDIRECT" && decision.destination) {
    redirect(decision.destination);
  }

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
