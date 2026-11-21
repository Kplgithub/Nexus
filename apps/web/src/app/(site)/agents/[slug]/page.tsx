import type { Metadata } from 'next';
import { ProfilePage, profileMetadata } from '@/components/profile/ProfilePages';

// Cache each page after its first visit and refresh it in the background once a minute (ISR).
// No paths are built ahead of time, so builds stay fast and do not need the API.
export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return profileMetadata('agent', (await params).slug);
}

export default async function Page({ params }: Props) {
  return <ProfilePage role="agent" slug={(await params).slug} />;
}
