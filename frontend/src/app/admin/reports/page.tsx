import type { Metadata } from 'next';
import AdminReportsClient from './AdminReportsClient';

export const metadata: Metadata = {
  title: 'Reports — BP AMS',
  description: 'Analytics and production performance reports.',
};

// Reports are fully dynamic (date-range driven) — page is thin, data loads client-side
export default function AdminReportsPage() {
  return <AdminReportsClient />;
}
