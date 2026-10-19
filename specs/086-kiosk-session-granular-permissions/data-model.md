# Data Model Specification: Kiosk Session Granular Permissions

**Feature**: Kiosk Session Granular Permissions  
**Branch**: `feat/SIAA-86-kiosk-session-granular-permissions`  
**Jira Issue**: [SIAA-86](https://the-three-devsketeers.atlassian.net/browse/SIAA-86)

---

## 1. Domain Entities & Interfaces

### 1.1 StaffPermissions
```typescript
export interface StaffPermissions {
  can_adjust_stock: boolean;
  can_override_discount: boolean;
  can_manage_pricing: boolean;
  can_view_reports: boolean;
}
```

### 1.2 Extended StaffKioskProfile
```typescript
export interface StaffKioskProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'mechanic' | 'inventory_clerk' | 'staff';
  roleDisplay: string;
  avatarInitials: string;
  pin?: string;
  permissions: StaffPermissions;
}
```

### 1.3 Extended Punch Store State
```typescript
export interface StaffMemberShiftState {
  isShiftActive: boolean;
  activeShiftId?: string | null;
  shiftStatus: ShiftStateStatus;
  shiftSeconds: number;
  shiftId?: string;
  staffName: string;
  profileId: string;
  role?: string;
  permissions?: StaffPermissions;
  clockInTime?: string;
}

export interface PunchStoreState {
  isShiftActive: boolean;
  activeShiftId: string | null;
  shiftSeconds: number;
  punchLogs: PunchLog[];
  currentStaff: string;
  currentProfileId: string;
  currentStaffRole: string;
  currentPermissions: StaffPermissions;
  shiftStatus: ShiftStateStatus;
  lastError: PunchStoreError | null;
  activeStaffCount: number;
  staffSessions: Record<string, StaffMemberShiftState>;
}
```

### 1.4 Server Action Results
```typescript
export interface VerifyStaffPinResult {
  success: boolean;
  profile?: StaffKioskProfile;
  code?: 'INVALID_PIN' | 'PROFILE_NOT_FOUND' | 'DATABASE_ERROR' | 'UNAUTHORIZED';
  error?: string;
}

export interface FetchStaffShiftResult {
  success: boolean;
  shift?: import('@/lib/types/logs').DbStaffShift | null;
  permissions: StaffPermissions;
  profile?: StaffKioskProfile;
  error?: string;
}
```

---

## 2. Default & Role Permission Mappings
- `admin`: All flags `true`.
- `inventory_clerk`: `can_adjust_stock: true`, all others `false`.
- `cashier`: All flags `false` by default (can be granted custom flags in `/admin/users`).
- `mechanic`: All flags `false` by default.
- `staff`: All flags `false` by default.
