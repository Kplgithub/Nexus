import type { Metadata } from 'next';
import { ProfileDirectory, directoryMetadata } from '@/components/profile/ProfilePages';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return directoryMetadata('builder', await searchParams);
}

export default async function Page({ searchParams }: Props) {
  return <ProfileDirectory role="builder" raw={await searchParams} />;
}
