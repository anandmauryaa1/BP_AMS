import type { Metadata } from 'next';
import { getMyProfile } from '@/lib/server-api';
import EmployeeProfileClient from './EmployeeProfileClient';

export const metadata: Metadata = {
  title: 'My Profile — BP AMS',
  description: 'View and update your profile information.',
};

export default async function EmployeeProfilePage() {
  const profile = await getMyProfile();
  return <EmployeeProfileClient initialProfile={profile} />;
}
