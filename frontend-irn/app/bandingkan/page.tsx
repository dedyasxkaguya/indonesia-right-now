import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StateCard } from '@/components/ui/StateCard';
import { CompareView } from '@/components/features/compare/CompareView';

export const metadata: Metadata = {
  title: 'Bandingkan Publisher',
  description: 'Bandingkan volume artikel, latensi, status sumber, kategori, dan kata kunci publisher aktif.',
};

export default function ComparePage() {
  return <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="loading" title="Memuat perbandingan" /></main>}><CompareView /></Suspense>;
}
