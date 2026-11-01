import type { Metadata } from 'next';
import { SecretTruthView } from '@/components/features/secret/SecretTruthView';

export const metadata: Metadata = {
  title: 'Yang Tertulis',
  robots: { index: false, follow: false },
};

export default function SecretTruthPage({ searchParams }: { searchParams?: { calm?: string | string[] } }) {
  const calm = searchParams?.calm === '1';
  return <SecretTruthView calm={calm} path="/__halaman-gelap/truth" />;
}
