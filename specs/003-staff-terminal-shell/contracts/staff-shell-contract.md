# Contract: Staff Shop Floor Terminal Shell Components

## 1. Components Interface Definition

### `StaffLayoutShellProps`
```typescript
export interface StaffLayoutShellProps {
  children: React.ReactNode;
}
```

### `StaffSidebarProps`
```typescript
export interface StaffSidebarProps {
  className?: string;
  onNavigate?: () => void;
}
```

### `StaffTopbarProps`
```typescript
export interface StaffTopbarProps {
  onMenuToggle: () => void;
  onOpenAdminSwitch: () => void;
}
```

### `ShiftDurationTimerProps`
```typescript
export interface ShiftDurationTimerProps {
  initialSeconds?: number;
  className?: string;
}
```

### `AdminSwitchModalProps`
```typescript
export interface AdminSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```
