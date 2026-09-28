import type { Metadata } from 'next';
import { getAttendanceRecords } from '@/lib/server-api';
import AdminAttendanceClient from './AdminAttendanceClient';

export const metadata: Metadata = {
  title: 'Attendance — BP AMS',
  description: 'Monitor and manage employee attendance records.',
};

export default async function AdminAttendancePage() {
  const today = new Date().toISOString().split('T')[0];
  const records = await getAttendanceRecords(today);
  return <AdminAttendanceClient initialRecords={records} />;
}
