"use client";

import React, { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { AdminMobileDrawer } from "./admin-mobile-drawer";

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-base font-sans">
      {/* Desktop Persistent Sidebar */}
      <AdminSidebar className="hidden md:flex shrink-0" />

      {/* Mobile Slide-Out Drawer */}
      <AdminMobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Topbar */}
        <AdminTopbar onOpenMobileMenu={() => setIsMobileDrawerOpen(true)} />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-bg-base">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
