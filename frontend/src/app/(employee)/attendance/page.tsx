import type { Metadata } from 'next';
import { getMyAttendanceHistory } from '@/lib/server-api';
import EmployeeAttendanceClient from './EmployeeAttendanceClient';

export const metadata: Metadata = {
  title: 'My Attendance — BP AMS',
  description: 'View your attendance history and work sessions.',
};

export default async function EmployeeAttendancePage() {
  const history = await getMyAttendanceHistory();

  return (
    <EmployeeAttendanceClient
      initialRecords={history.records}
      initialSummary={history.summary}
      initialUser={history.user}
    />
  );
}
