import type { Metadata } from 'next';
import EmployeePayrollClient from './EmployeePayrollClient';

export const metadata: Metadata = {
  title: 'My Payroll & Payslips — BP AMS',
  description: 'View your salary structure, declare income tax savings (80C/80D/HRA), download payslips, and request salary loans.',
};

export default function EmployeePayrollPage() {
  return <EmployeePayrollClient />;
}
