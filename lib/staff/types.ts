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

export interface ShiftActionResult {
  success: boolean;
  shiftId?: string;
  staffName?: string;
  terminalId?: string;
  clockIn?: string;
  clockOut?: string;
  durationFormatted?: string;
  status?: 'on_shift' | 'break' | 'completed';
  error?: string;
  code?: string;
}

export interface AttendanceHistoryResult {
  success: boolean;
  logs: import("@/lib/types/logs").PunchLog[];
  activeShift: import("@/lib/types/logs").DbStaffShift | null;
  error?: string;
}

export interface ProductPriceCheckResult {
  success: boolean;
  product?: {
    id: string;
    sku: string;
    name: string;
    category: string;
    brand: string;
    model: string;
    stock: number;
    minThreshold: number;
    location: string;
    retailPrice: number;
    wholesalePrice: number;
    scPwdPrice: number;
  };
  error?: string;
  code?: 'PRODUCT_NOT_FOUND' | 'INVALID_QUERY' | 'DATABASE_ERROR';
}

export interface AdminElevationResult {
  success: boolean;
  elevatedUntil?: number;
  error?: string;
  code?: 'INVALID_PIN' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'SERVER_ERROR';
}

export type PunchClockAction = 'in' | 'out' | 'break';

export type PunchClockStatus = 'on_shift' | 'break' | 'completed' | 'idle';

export interface StaffShiftSession {
  id: string;
  staffName: string;
  terminalId: string;
  date: string;
  timeIn: string;
  timeOut: string;
  durationSeconds: number;
  durationFormatted: string;
  status: PunchClockStatus;
  notes?: string | null;
}


