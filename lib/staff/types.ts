import { ElementType } from "react";

/**
 * Staff Shop Floor Terminal Types & Schemas
 * Source of truth: SIAA-10 (STORY-1.3), mockup/staff.html, and specs/003-staff-terminal-shell/data-model.md
 */

export type StaffBadgeVariant = "success" | "warning" | "primary" | "danger" | "info";

export interface StaffNavBadge {
  text: string;
  variant: StaffBadgeVariant;
}

export interface StaffNavItem {
  id: string;
  label: string;
  href: string;
  category?: string;
  badge?: StaffNavBadge;
  icon?: ElementType;
}

export interface StaffUserProfile {
  name: string;
  role: string;
  avatarInitials: string;
  email?: string;
}

export interface StaffShiftState {
  terminalId: string;
  employeeName: string;
  role: string;
  initialElapsedSeconds: number;
  isOnShift: boolean;
}
