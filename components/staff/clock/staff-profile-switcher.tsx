"use client";

import React, { useState } from "react";
import { Users, ChevronDown, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/users";
import { usePunchStore } from "@/lib/store/punch-store";
import { StaffPinModal } from "./staff-pin-modal";
import type { StaffKioskProfile } from "@/lib/staff/types";

interface StaffProfileSwitcherProps {
  className?: string;
  onStaffSwitched?: (profile: StaffKioskProfile) => void;
}

export function StaffProfileSwitcher({
  className = "",
  onStaffSwitched,
}: StaffProfileSwitcherProps) {
  const { currentStaff, currentProfileId, switchStaff, getStaffSession } = usePunchStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<StaffKioskProfile | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const activeProfile =
    MOCK_STAFF_PROFILES.find((p) => p.id === currentProfileId) || MOCK_STAFF_PROFILES[1];

  function handleSelectStaff(profile: typeof MOCK_STAFF_PROFILES[0]) {
    setIsDropdownOpen(false);
    if (profile.id === currentProfileId) return;

    setSelectedTarget({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      roleDisplay: profile.roleDisplay,
      permissions: profile.permissions,
      avatarInitials: profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase(),
    });
    setIsPinModalOpen(true);
  }

  function handlePinSuccess(profile: StaffKioskProfile) {
    switchStaff({
      id: profile.id,
      name: profile.name,
      role: profile.role,
      permissions: profile.permissions,
    });
    setIsPinModalOpen(false);
    setSelectedTarget(null);
    if (onStaffSwitched) {
      onStaffSwitched(profile);
    }
  }

  return (
    <div className={`relative mb-6 ${className}`}>
      {/* Current Operator Card & Switch Trigger */}
      <div className="bg-bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-black flex items-center justify-center text-sm shrink-0">
            {activeProfile.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Current Terminal Operator:
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-light px-2 py-0.5 rounded-full border border-success/30">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            </div>
            <div className="text-sm font-extrabold text-text-primary">
              {currentStaff || activeProfile.name}
            </div>
            <div className="text-xs text-text-muted">
              {activeProfile.roleDisplay} • <span className="font-mono">Terminal #01</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="w-full sm:w-auto py-2 px-3.5 bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Switch Staff Profile</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Profile Selector Dropdown / Popover */}
      {isDropdownOpen && (
        <div
          role="listbox"
          aria-label="Select staff profile"
          className="absolute left-0 right-0 top-full mt-2 z-40 bg-bg-surface border border-border rounded-xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border mb-1 flex items-center justify-between">
            <span>Shop Floor Staff Roster</span>
            <span className="text-[10px] font-normal lowercase">PIN verification required</span>
          </div>

          <div className="space-y-1">
            {MOCK_STAFF_PROFILES.map((profile) => {
              const isCurrent = profile.id === currentProfileId;
              const session = getStaffSession(profile.id);
              const sessionStatus = session?.shiftStatus || "idle";

              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelectStaff(profile)}
                  className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-primary-light/40 border border-primary/30"
                      : "hover:bg-bg-hover border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-card border border-border font-bold text-xs flex items-center justify-center text-text-primary">
                      {profile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <span>{profile.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-primary text-text-light px-1.5 py-0.2 rounded font-black">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted">{profile.roleDisplay}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sessionStatus === "on_shift" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success-light px-2 py-0.5 rounded-full border border-success/30">
                        <Clock className="w-2.5 h-2.5" />
                        On Shift
                      </span>
                    )}
                    {sessionStatus === "break" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent-light px-2 py-0.5 rounded-full border border-accent/30">
                        Break
                      </span>
                    )}
                    {sessionStatus === "completed" && (
                      <span className="text-[10px] text-text-muted bg-bg-muted px-2 py-0.5 rounded-full border border-border">
                        Clocked Out
                      </span>
                    )}
                    {sessionStatus === "idle" && (
                      <span className="text-[10px] text-text-muted bg-bg-muted px-2 py-0.5 rounded-full border border-border">
                        Idle
                      </span>
                    )}
                    {isCurrent && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PIN Verification Modal for Target Staff Member */}
      {selectedTarget && (
        <StaffPinModal
          isOpen={isPinModalOpen}
          onClose={() => {
            setIsPinModalOpen(false);
            setSelectedTarget(null);
          }}
          targetProfile={selectedTarget}
          onSuccess={handlePinSuccess}
          actionContext="switch_staff"
        />
      )}
    </div>
  );
}
