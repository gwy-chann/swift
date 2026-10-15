# Data Model: Terminal Digital Shift Punch Clock & Active Duration Counter

**Feature**: `029-terminal-digital-shift-punch-clock`  
**Jira Ticket**: [SIAA-29](https://the-three-devsketeers.atlassian.net/browse/SIAA-29)  

---

## 1. Domain Entities & State Types

### Staff Shift State (`StaffShiftState`)
Reflects current terminal employee shift state:
```typescript
export type ShiftStatus = 'on_shift' | 'break' | 'completed' | 'idle';

export interface StaffShiftSession {
  id: string; // Unique punch ID e.g. PUNCH-1728956000000 or UUID
  staffName: string; // Name of staff e.g. "Mike Morales"
  terminalId: string; // Terminal identifier e.g. "Terminal #01 - Shop Floor"
  date: string; // YYYY-MM-DD
  timeIn: string; // Formatted 12h e.g. "08:14:30 AM"
  timeOut: string; // Formatted 12h or "-- Active Shift --"
  durationSeconds: number; // Raw seconds
  durationFormatted: string; // e.g. "04h 12m" or "00h 00m"
  status: ShiftStatus;
  notes?: string | null;
}
```

### Punch Store Interface
```typescript
export interface PunchStoreState {
  isShiftActive: boolean;
  shiftSeconds: number;
  punchLogs: PunchLog[];
  currentStaff: string;
  shiftStatus: 'on_shift' | 'break' | 'completed' | 'idle';
  lastError: {
    code: string;
    message: string;
    timestamp: number;
  } | null;
  activeStaffCount: number;
}
```

---

## 2. Component Contract & Props

### Live Clock (`TerminalLiveClock`)
```typescript
export interface TerminalLiveClockProps {
  className?: string;
  timeFormat?: '12h' | '24h'; // default '12h'
  showSeconds?: boolean; // default true
}
```

### Shift Duration Timer (`ShiftDurationTimer`)
```typescript
export interface ShiftDurationTimerProps {
  className?: string;
  showLabel?: boolean;
}
```

### Punch Clock Panel (`StaffClockPanel`)
```typescript
export interface StaffClockPanelProps {
  terminalId?: string;
  staffName?: string;
  onClockIn?: () => void;
  onClockOut?: () => void;
  className?: string;
}
```
