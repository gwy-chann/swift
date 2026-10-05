import { ElementType } from "react";

/**
 * Admin Portal Navigation Types & Schemas
 * Source of truth: SIAA-9 (STORY-1.2), mockup/admin.html, and specs/002-admin-portal-shell/data-model.md
 */

export type NavCategory = "Store Intelligence" | "Administration";

export type BadgeVariant = "danger" | "warning" | "success" | "info" | "neutral";

export interface NavBadge {
  text: string;
  variant: BadgeVariant;
}

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  category: NavCategory;
  badge?: NavBadge;
  icon?: ElementType;
}

export interface AdminUserMeta {
  name: string;
  role: string;
  avatarInitials: string;
  email?: string;
}

export interface TerminalStatus {
  online: boolean;
  terminalNumber: string;
  serviceBaysOnline: number;
}
