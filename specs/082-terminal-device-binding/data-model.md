# Data Model Specification: Terminal Device Binding

**Feature**: Terminal Device Binding  
**Branch**: `feat/SIAA-82-terminal-device-binding`  
**Jira Issue**: [SIAA-82](https://the-three-devsketeers.atlassian.net/browse/SIAA-82)  

---

## 1. Domain Entities & Interfaces

### 1.1 TerminalDevice
Represents a physical device enrolled to operate as a point-of-sale and punch-clock workstation.

```typescript
export interface TerminalDevice {
  terminalId: string; // e.g. "Terminal #01", "Terminal #02"
  deviceToken: string; // e.g. "term_token_uuid"
  deviceName: string; // e.g. "Primary Counter Laptop"
  isAuthorized: boolean;
  enrolledAt: string; // ISO 8601 timestamp
  lastUsedAt?: string;
  fingerprint?: string; // Optional user-agent / client indicator
}
```

### 1.2 TerminalRegistrationPayload
Input schema for enrolling or updating a terminal binding via master administrative override.

```typescript
export interface TerminalRegistrationPayload {
  terminalId: string;
  deviceName: string;
  masterPin: string; // e.g. "8888"
}
```

### 1.3 TerminalValidationResult
Result returned by server-side verification and client validation guards.

```typescript
export interface TerminalValidationResult {
  valid: boolean;
  terminalId?: string;
  deviceName?: string;
  errorCode?: 'UNAUTHORIZED_TERMINAL_DEVICE' | 'TOKEN_EXPIRED' | 'DEVICE_REVOKED' | 'INVALID_PIN';
  error?: string;
}
```

### 1.4 Extended Shift Action Inputs & Queue Models
Update `ClockInShiftInput` and `QueuedPunchAction` to capture `deviceToken`:

```typescript
export interface ClockInShiftInput {
  terminalId?: string;
  notes?: string;
  profileId?: string;
  deviceToken?: string;
}

export interface QueuedPunchAction {
  id?: string;
  type: 'clock_in' | 'clock_out' | 'toggle_break';
  profileId: string;
  staffName: string;
  terminalId: string;
  deviceToken?: string;
  shiftId?: string;
  timestamp?: number;
}
```

---

## 2. Default Seed & Mock Terminal Bindings
- `DEFAULT_PRIMARY_TERMINAL_ID`: `"Terminal #01"`
- `DEFAULT_PRIMARY_TERMINAL_NAME`: `"Primary Counter Laptop"`
- `DEFAULT_PRIMARY_DEVICE_TOKEN`: `"term_token_swift_primary_counter_01"`
- `MASTER_ADMIN_PIN`: `"8888"` (from `MOCK_STAFF_PROFILES`)
