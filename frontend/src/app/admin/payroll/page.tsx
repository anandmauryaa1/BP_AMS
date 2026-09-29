import type { Metadata } from 'next';
import AdminPayrollClient from './AdminPayrollClient';

export const metadata: Metadata = {
  title: 'Payroll & Compliance — BP AMS',
  description: 'Manage employee payroll structures, tax regimes, loan disbursements, 1-click payroll processing, and statutory EPF/ESIC/Form16 compliance exports.',
};

export default function AdminPayrollPage() {
  return <AdminPayrollClient />;
}
