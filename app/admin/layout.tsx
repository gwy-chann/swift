import React from "react";
import { Metadata } from "next";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export const metadata: Metadata = {
  title: "SWIFT - Admin Management Portal",
  description: "Executive Management Portal for Inventory, POS, MotoMatcher & Reports",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
