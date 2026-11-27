import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { StaffLayoutShell } from "@/components/staff/staff-layout-shell";
import { getServerSession, evaluateRouteAccess } from "@/lib/auth/session-guards";

export const metadata: Metadata = {
  title: "SWIFT - Staff Shop Floor & POS Portal",
  description: "High-speed Shop Floor Terminal for POS, Stock Lookup, Fitment & Time Clock",
};

export default async function StaffRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ||
    headersList.get("x-invoke-path") ||
    headersList.get("next-url") ||
    "";

  // If viewing the mobile companion scanner, render directly without staff auth or desktop shell
  if (pathname.includes("/staff/pos/scanner")) {
    return <>{children}</>;
  }

  const session = await getServerSession();
  const decision = evaluateRouteAccess("/staff/pos", session);
  if (decision.action === "REDIRECT" && decision.destination) {
    redirect(decision.destination);
  }

  return (
    <StaffLayoutShell
      sessionUser={{
        id: session?.userId,
        name: session?.userName,
        role: session?.staffRole || (session?.role === "admin" ? "admin" : undefined),
      }}
    >
      {children}
    </StaffLayoutShell>
  );
}
