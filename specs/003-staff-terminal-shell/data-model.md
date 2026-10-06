# Data Model: Staff Shop Floor Terminal Layout Shell

## 1. Staff Navigation Schema

```typescript
export interface StaffNavItem {
  id: string;
  label: string;
  href: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'primary' | 'danger';
  };
}

export interface StaffUserProfile {
  initials: string;
  name: string;
  role: string;
}

export interface StaffShiftState {
  terminalId: string;
  employeeName: string;
  role: string;
  shiftStartTime: string; // ISO timestamp
  isOnShift: boolean;
}
```

## 2. Default Seed Values (Derived from `mockup/staff.html`)

- **Default User**:
  - Initials: `MM`
  - Name: `Mike Morales`
  - Role: `Cashier / Floor Staff`
- **Default Station**:
  - Terminal ID: `Terminal #01 - Shop Floor`
- **Default Shift**:
  - Status: `ON SHIFT`
  - Duration Base: `04:12:30` (or computed dynamically from session start)
