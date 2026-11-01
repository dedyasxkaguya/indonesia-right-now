import { StateCard } from '@/components/ui/StateCard';

export default function Loading() {
  return <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><StateCard variant="loading" title="Memuat data" description="Menghubungkan tampilan dengan sumber berita." /></div>;
}
