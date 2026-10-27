import type { AdminStaffShift, AttendanceSummaryMetrics } from '../../types/logs.ts';

/**
 * Generates ISO string offset from current date for deterministic and realistic relative dates.
 */
function getRelativeDate(daysAgo: number, timeStr: string): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const datePart = d.toISOString().slice(0, 10);
  return `${datePart}T${timeStr}:00.000Z`;
}

function formatDateOnly(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export const MOCK_ADMIN_SHIFTS: AdminStaffShift[] = [
  // 1. Today Active Shift (Cashier)
  {
    id: 'shift-mock-001',
    profileId: '00000000-0000-0000-0000-000000000002',
    staffName: 'Mike Morales',
    staffRole: 'Cashier',
    terminalId: 'Terminal #1 (POS)',
    date: formatDateOnly(0),
    isToday: true,
    timeIn: '08:00:00 AM',
    clockInIso: getRelativeDate(0, '08:00'),
    timeOut: '-- Active Shift --',
    clockOutIso: null,
    duration: '06h 45m',
    durationSeconds: 24300,
    status: 'on_shift',
    statusLabel: 'On Shift',
    isExtendedShift: false,
    notes: 'Morning shift opening register',
  },
  // 2. Today On Break (Mechanic)
  {
    id: 'shift-mock-002',
    profileId: '00000000-0000-0000-0000-000000000003',
    staffName: 'Dante Reyes',
    staffRole: 'Senior Mechanic',
    terminalId: 'Bay #2 Tablet',
    date: formatDateOnly(0),
    isToday: true,
    timeIn: '08:30:00 AM',
    clockInIso: getRelativeDate(0, '08:30'),
    timeOut: '-- Active Shift --',
    clockOutIso: null,
    duration: '04h 15m',
    durationSeconds: 15300,
    status: 'break',
    statusLabel: 'Break',
    isExtendedShift: false,
    notes: '30-minute lunch interval',
  },
  // 3. Today Completed Shift (Inventory Clerk)
  {
    id: 'shift-mock-003',
    profileId: '00000000-0000-0000-0000-000000000004',
    staffName: 'Rico Santos',
    staffRole: 'Inventory Clerk',
    terminalId: 'Warehouse Kiosk',
    date: formatDateOnly(0),
    isToday: true,
    timeIn: '06:00:00 AM',
    clockInIso: getRelativeDate(0, '06:00'),
    timeOut: '02:30:00 PM',
    clockOutIso: getRelativeDate(0, '14:30'),
    duration: '08h 30m',
    durationSeconds: 30600,
    status: 'completed',
    statusLabel: 'Completed',
    isExtendedShift: false,
    notes: 'Early morning stock intake verified',
  },
  // 4. Yesterday Completed (Sales Associate)
  {
    id: 'shift-mock-004',
    profileId: '00000000-0000-0000-0000-000000000005',
    staffName: 'Elena Santos',
    staffRole: 'Sales Associate',
    terminalId: 'Terminal #2 (Counter)',
    date: formatDateOnly(1),
    isToday: false,
    timeIn: '09:00:00 AM',
    clockInIso: getRelativeDate(1, '09:00'),
    timeOut: '06:00:00 PM',
    clockOutIso: getRelativeDate(1, '18:00'),
    duration: '09h 00m',
    durationSeconds: 32400,
    status: 'completed',
    statusLabel: 'Completed',
    isExtendedShift: false,
    notes: 'Counter sales and order dispatch',
  },
  // 5. Yesterday Completed (Cashier)
  {
    id: 'shift-mock-005',
    profileId: '00000000-0000-0000-0000-000000000002',
    staffName: 'Mike Morales',
    staffRole: 'Cashier',
    terminalId: 'Terminal #1 (POS)',
    date: formatDateOnly(1),
    isToday: false,
    timeIn: '08:00:00 AM',
    clockInIso: getRelativeDate(1, '08:00'),
    timeOut: '05:00:00 PM',
    clockOutIso: getRelativeDate(1, '17:00'),
    duration: '09h 00m',
    durationSeconds: 32400,
    status: 'completed',
    statusLabel: 'Completed',
    isExtendedShift: false,
    notes: 'Full day cashier rotation',
  },
  // 6. 2 Days Ago Completed (Mechanic)
  {
    id: 'shift-mock-006',
    profileId: '00000000-0000-0000-0000-000000000003',
    staffName: 'Dante Reyes',
    staffRole: 'Senior Mechanic',
    terminalId: 'Bay #1 Workstation',
    date: formatDateOnly(2),
    isToday: false,
    timeIn: '08:15:00 AM',
    clockInIso: getRelativeDate(2, '08:15'),
    timeOut: '05:15:00 PM',
    clockOutIso: getRelativeDate(2, '17:15'),
    duration: '09h 00m',
    durationSeconds: 32400,
    status: 'completed',
    statusLabel: 'Completed',
    isExtendedShift: false,
    notes: 'Brake overhaul and chain sprocket replacement',
  },
  // 7. 3 Days Ago Completed (Inventory Clerk)
  {
    id: 'shift-mock-007',
    profileId: '00000000-0000-0000-0000-000000000004',
    staffName: 'Rico Santos',
    staffRole: 'Inventory Clerk',
    terminalId: 'Warehouse Kiosk',
    date: formatDateOnly(3),
    isToday: false,
    timeIn: '07:30:00 AM',
    clockInIso: getRelativeDate(3, '07:30'),
    timeOut: '04:00:00 PM',
    clockOutIso: getRelativeDate(3, '16:00'),
    duration: '08h 30m',
    durationSeconds: 30600,
    status: 'completed',
    statusLabel: 'Completed',
    isExtendedShift: false,
    notes: 'Shelf barcode audit cycle',
  },
  // 8. 4 Days Ago (Overnight Shift Edge Case)
  {
    id: 'shift-mock-008',
    profileId: '00000000-0000-0000-0000-000000000006',
    staffName: 'Bryan Torres',
    staffRole: 'Security / Night Custodian',
    terminalId: 'Main Gate Terminal',
    date: formatDateOnly(4),
    isToday: false,
    timeIn: '10:00:00 PM',
    clockInIso: getRelativeDate(4, '22:00'),
    timeOut: '06:00:00 AM',
    clockOutIso: getRelativeDate(3, '06:00'),
    duration: '08h 00m',
    durationSeconds: 28800,
    status: 'completed',
    statusLabel: 'Completed',
    isExtendedShift: false,
    notes: 'Overnight facilities check',
  },
];

export const MOCK_ATTENDANCE_METRICS: AttendanceSummaryMetrics = {
  currentlyOnShift: 1,
  currentlyOnBreak: 1,
  shiftsCompletedToday: 1,
  totalHoursLoggedToday: '19h 30m',
  totalRecordsCount: MOCK_ADMIN_SHIFTS.length,
};
