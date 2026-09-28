import type { Metadata } from 'next';
import EmployeeAttendanceClient from './EmployeeAttendanceClient';

export const metadata: Metadata = {
  title: 'My Attendance — BP AMS',
  description: 'View your attendance history and work sessions.',
};

export default function EmployeeAttendancePage() {
  // Attendance history is date-range paginated — loads client-side
  return <EmployeeAttendanceClient />;
}
