import type { Metadata } from 'next';
import { getChannels } from '@/lib/server-api';
import AdminChannelsClient from './AdminChannelsClient';

export const metadata: Metadata = {
  title: 'Channels — BP AMS',
  description: 'Manage YouTube, Instagram, and Facebook channels.',
};

export default async function AdminChannelsPage() {
  const channels = await getChannels();
  return <AdminChannelsClient initialChannels={channels} />;
}
