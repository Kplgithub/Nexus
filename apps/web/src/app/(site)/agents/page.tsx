import type { Metadata } from 'next';
import { ProfileDirectory, directoryMetadata } from '@/components/profile/ProfilePages';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return directoryMetadata('agent', await searchParams);
}

export default async function Page({ searchParams }: Props) {
  return <ProfileDirectory role="agent" raw={await searchParams} />;
}
