import type { Metadata } from 'next';
import { getMyPayroll } from '@/lib/server-api';
import EmployeePayrollClient from './EmployeePayrollClient';

export const metadata: Metadata = {
  title: 'My Payroll & Payslips — BP AMS',
  description: 'View your salary structure, declare income tax savings (80C/80D/HRA), download payslips, and request salary loans.',
};

export default async function EmployeePayrollPage() {
  const payrollData = await getMyPayroll();

  return (
    <EmployeePayrollClient
      initialStructure={payrollData.structure}
      initialDeclaration={payrollData.declaration}
      initialPayslips={payrollData.payslips}
      initialLoans={payrollData.loans}
      initialUser={payrollData.user}
    />
  );
}
