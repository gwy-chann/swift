/**
 * Contract: Session Route Guard Specifications
 * Defines types and pure evaluation functions for route access control.
 */

import { PortalRole } from "@/lib/auth/types";

export type RouteClassification =
  | "AUTH_HUB"
  | "ADMIN_PORTAL"
  | "STAFF_PORTAL"
  | "PUBLIC_ASSET"
  | "OTHER";

export interface ResolvedSession {
  isAuthenticated: boolean;
  role: PortalRole | null;
  userId?: string;
  source: "supabase" | "demo" | "none";
}

export interface GuardDecision {
  action: "ALLOW" | "REDIRECT";
  destination?: string;
  statusCode?: 307 | 308;
}

export interface RouteGuardContract {
  classifyRoute(pathname: string): RouteClassification;
  evaluateRouteAccess(pathname: string, session: ResolvedSession): GuardDecision;
  resolveSessionFromCookies(cookies: {
    get(name: string): { value: string } | undefined;
  }): ResolvedSession;
}
