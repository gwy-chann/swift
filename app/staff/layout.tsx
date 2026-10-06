import React from "react";
import { Metadata } from "next";
import { StaffLayoutShell } from "@/components/staff/staff-layout-shell";

export const metadata: Metadata = {
  title: "SWIFT - Staff Shop Floor & POS Portal",
  description: "High-speed Shop Floor Terminal for POS, Stock Lookup, Fitment & Time Clock",
};

export default function StaffRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaffLayoutShell>{children}</StaffLayoutShell>;
}
