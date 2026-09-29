import type { Metadata } from 'next';
import AdminHcmClient from './AdminHcmClient';

export const metadata: Metadata = {
  title: 'HCM & Exit Clearance — BP AMS',
  description: 'Manage 360° Employee Digital Document Vault, Document Verifications, and Offboarding FnF NOC Exit Clearances.',
};

export default function AdminHcmPage() {
  return <AdminHcmClient />;
}
