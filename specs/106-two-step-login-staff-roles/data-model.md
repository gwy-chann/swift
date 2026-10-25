# Data Model & State Architecture: Staff Two-Step Login (SIAA-106)

**Feature**: Auth: Enforce two-step login sequence (Password then PIN) for all staff roles  
**Ticket**: [SIAA-106](https://the-three-devsketeers.atlassian.net/browse/SIAA-106)  
**Date**: 2026-10-26  

---

## 1. Domain Entities & Type Definitions

```typescript
/**
 * Intermediate challenge payload persisted during Step 1
 * Stored in HttpOnly cookie 'swift-pending-staff-auth'
 */
export interface PendingStaffAuthChallenge {
  userId: string;
  email: string;
  name: string;
  role: 'cashier' | 'mechanic' | 'inventory_clerk' | string;
  portalRole: 'staff';
  targetUrl: string;
  rememberTerminal: boolean;
  challengeIssuedAt: number;
  expiresAt: number;
}

/**
 * Public summary exposed to client-side Step 2 keypad
 */
export interface PendingStaffSummary {
  userId: string;
  email: string;
  name: string;
  role: string;
  roleDisplay: string;
  targetUrl: string;
}

/**
 * Response from Step 1 credential initiation
 */
export interface InitiateStaffLoginResult {
  success: boolean;
  requiresPin: boolean;
  step: 'CREDENTIALS' | 'ENTER_PIN';
  staffSummary?: PendingStaffSummary;
  redirectTo?: string;
  error?: string;
  code?: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' | 'NETWORK_ERROR' | 'SUCCESS';
}

/**
 * Response from Step 2 PIN verification
 */
export interface CompleteStaffTwoStepLoginResult {
  success: boolean;
  redirectTo?: string;
  session?: {
    id: string;
    email: string;
    name: string;
    role: string;
    expiresAt: number;
  };
  error?: string;
  code?: 'INVALID_PIN' | 'CHALLENGE_EXPIRED' | 'ACCOUNT_INACTIVE' | 'SUCCESS';
}
```

---

## 2. Storage & Cookie Schema

| Cookie Key | Type | HttpOnly | SameSite | MaxAge | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `swift-pending-staff-auth` | JSON Encoded String | `true` | `Lax` | 900s (15 min) | Transient challenge token indicating Step 1 passed, awaiting Step 2 PIN. |
| `swift-session-role` | String (`"admin"` / `"staff"`) | `true` | `Lax` | 1 day / 30 days | Authoritative authorized session role. Only set AFTER successful PIN entry. |
| `swift-user-name` | String | `false` | `Lax` | 1 day / 30 days | Client-display user name for header / navigation. |
| `swift-session-user-id` | UUID String | `true` | `Lax` | 1 day / 30 days | User ID identifier for ledger and shift binding. |

---

## 3. Session Guard Resolution Model

```typescript
export interface ResolvedSession {
  isAuthenticated: boolean;
  role: PortalRole | null;
  userId?: string;
  source: 'supabase' | 'demo' | 'none';
  isInactive?: boolean;
  hasPendingPinChallenge?: boolean; // NEW: Tracks intermediate challenge state
  pendingStaffEmail?: string;       // NEW: Pre-fills Step 2 on fresh page load
}
```

When evaluating `/staff/*` routes:
- If `isAuthenticated === true` && `role === 'staff'`: `ALLOW`
- If `hasPendingPinChallenge === true`: `REDIRECT -> /login?notice=pin_required`
- If unauthenticated: `REDIRECT -> /`
