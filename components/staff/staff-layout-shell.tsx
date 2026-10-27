"use client";

import React, { useState, useEffect } from "react";
import { StaffSidebar } from "./staff-sidebar";
import { StaffTopbar } from "./staff-topbar";
import { StaffMobileDrawer } from "./staff-mobile-drawer";
import { punchStore, usePunchStore } from "@/lib/store/punch-store";
import { fetchStaffShiftAction } from "@/lib/staff/actions";

interface StaffLayoutShellProps {
  children: React.ReactNode;
  sessionUser?: {
    id?: string;
    name?: string;
    role?: string;
  };
}

export function StaffLayoutShell({ children, sessionUser }: Readonly<StaffLayoutShellProps>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isShiftActive, shiftStatus, currentProfileId } = usePunchStore();

  // Align client punchStore with server authenticated session
  useEffect(() => {
    if (sessionUser?.id && sessionUser.id !== currentProfileId) {
      punchStore.switchStaff({
        id: sessionUser.id,
        name: sessionUser.name || "Staff Member",
        role: sessionUser.role,
        startOffShift: true,
      });
    }
  }, [sessionUser, currentProfileId]);

  // Synchronize active staff member's role and permissions from server/ledger
  useEffect(() => {
    if (!currentProfileId) return;
    let isMounted = true;

    fetchStaffShiftAction(currentProfileId)
      .then((res) => {
        if (isMounted && res.success && res.profile?.role) {
          punchStore.syncStaffRole(currentProfileId, res.profile.role, res.permissions);
        }
      })
      .catch((err) => {
        console.warn("[StaffLayoutShell] Could not sync staff role from server:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentProfileId]);

  // Global active shift heartbeat: increments punchStore active counter every 1s while on shift
  useEffect(() => {
    if (!isShiftActive || shiftStatus === "break") return;

    const interval = setInterval(() => {
      punchStore.tickSecond();
    }, 1000);

    return () => clearInterval(interval);
  }, [isShiftActive, shiftStatus]);

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

      {/* Main Workspace */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <StaffTopbar
          onMenuToggle={() => setIsMobileMenuOpen(true)}
        />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-bg-base">
          {children}
        </main>
      </div>
    </div>
  );
}
