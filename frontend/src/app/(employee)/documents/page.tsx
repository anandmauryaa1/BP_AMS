import type { Metadata } from 'next';
import EmployeeDocumentsClient from './EmployeeDocumentsClient';

export const metadata: Metadata = {
  title: 'My Documents Vault — BP AMS',
  description: 'Manage personal digital document vault, upload Aadhaar/PAN, and track offboarding exit clearance NOC status.',
};

export default function EmployeeDocumentsPage() {
  return <EmployeeDocumentsClient />;
}
