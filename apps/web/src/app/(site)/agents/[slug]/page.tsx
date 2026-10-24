import type { Metadata } from 'next';
import { ProfilePage, profileMetadata } from '@/components/profile/ProfilePages';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return profileMetadata('agent', (await params).slug);
}

export default async function Page({ params }: Props) {
  return <ProfilePage role="agent" slug={(await params).slug} />;
}
