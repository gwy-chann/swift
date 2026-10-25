import React from 'react';
import type { Metadata } from 'next';
import { getAdminStaffAttendanceAction } from '@/lib/admin/attendance-actions';
import { AttendanceView } from '@/components/admin/attendance/attendance-view';

export const metadata: Metadata = {
  title: 'Staff Shift Attendance & Time Clock History | SWIFT Admin',
  description: 'Audit employee work shifts, time-in and time-out records, and monitor live shop floor attendance.',
};

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage() {
  const result = await getAdminStaffAttendanceAction();

  const initialShifts = result.success ? result.shifts : [];
  const initialMetrics = result.success
    ? result.metrics
    : {
        currentlyOnShift: 0,
        currentlyOnBreak: 0,
        shiftsCompletedToday: 0,
        totalHoursLoggedToday: '00h 00m',
        totalRecordsCount: 0,
      };

  return (
    <div className="w-full max-w-7xl mx-auto py-2">
      <AttendanceView
        initialShifts={initialShifts}
        initialMetrics={initialMetrics}
      />
    </div>
  );
}
