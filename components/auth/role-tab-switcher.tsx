"use client";

import React from "react";
import { PortalRole } from "@/lib/auth/types";

interface RoleTabSwitcherProps {
  selectedRole: PortalRole;
  onRoleChange: (role: PortalRole) => void;
  disabled?: boolean;
}

/**
 * Role switcher tab bar for toggling between Admin and Staff portals
 * Replicates the active states and transitions from mockup/index.html & mockup/style.css
 */
export function RoleTabSwitcher({
  selectedRole,
  onRoleChange,
  disabled = false,
}: RoleTabSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Portal Selection"
      className="grid grid-cols-2 rounded-md bg-bg-muted p-1 mb-6 border border-border"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedRole === "admin"}
        aria-controls="admin-portal-panel"
        id="tab-admin"
        disabled={disabled}
        onClick={() => onRoleChange("admin")}
        className={`py-2.5 px-4 text-sm font-semibold rounded transition-all duration-150 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          selectedRole === "admin"
            ? "bg-primary text-white shadow-sm font-bold"
            : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        Admin Portal
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={selectedRole === "staff"}
        aria-controls="staff-portal-panel"
        id="tab-staff"
        disabled={disabled}
        onClick={() => onRoleChange("staff")}
        className={`py-2.5 px-4 text-sm font-semibold rounded transition-all duration-150 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
          selectedRole === "staff"
            ? "bg-secondary text-white shadow-sm font-bold"
            : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        Staff Portal
      </button>
    </div>
  );
}
