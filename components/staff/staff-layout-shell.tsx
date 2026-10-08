"use client";

import React, { useState } from "react";
import { StaffSidebar } from "./staff-sidebar";
import { StaffTopbar } from "./staff-topbar";
import { StaffMobileDrawer } from "./staff-mobile-drawer";
import { AdminSwitchModal } from "./admin-switch-modal";

interface StaffLayoutShellProps {
  children: React.ReactNode;
}

export function StaffLayoutShell({ children }: Readonly<StaffLayoutShellProps>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminSwitchOpen, setIsAdminSwitchOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-bg-base overflow-hidden">
      {/* Desktop Permanent Sidebar */}
      <div className="hidden md:block shrink-0">
        <StaffSidebar />
      </div>

      {/* Mobile Slide-Out Drawer */}
      <StaffMobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Admin Portal Switch Modal */}
      <AdminSwitchModal
        isOpen={isAdminSwitchOpen}
        onClose={() => setIsAdminSwitchOpen(false)}
      />

      {/* Main Workspace */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <StaffTopbar
          onMenuToggle={() => setIsMobileMenuOpen(true)}
          onOpenAdminSwitch={() => setIsAdminSwitchOpen(true)}
        />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-bg-base">
          {children}
        </main>
      </div>
    </div>
  );
}
