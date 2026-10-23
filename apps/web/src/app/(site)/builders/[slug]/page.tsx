import type { Metadata } from 'next';
import { ProfilePage, profileMetadata } from '@/components/profile/ProfilePages';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return profileMetadata('builder', (await params).slug);
}

export default async function Page({ params }: Props) {
  return <ProfilePage role="builder" slug={(await params).slug} />;
}
