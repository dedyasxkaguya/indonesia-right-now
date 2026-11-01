import type { Metadata } from 'next';
import { SecretSafeView } from '@/components/features/secret/SecretSafeView';

export const metadata: Metadata = {
  title: 'Halaman Gelap',
  robots: { index: false, follow: false },
};

export default function SecretPage({ searchParams }: { searchParams?: { calm?: string | string[] } }) {
  const calm = searchParams?.calm === '1';
  return <SecretSafeView calm={calm} path="/__halaman-gelap" />;
}
