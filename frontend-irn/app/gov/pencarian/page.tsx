import type { Metadata } from 'next';
import { GovSearch } from '@/components/igs/GovSearch';
import { GovPageHeader } from '@/components/igs/GovPageHeader';
import { metricDefinitions, provinces, kabkota } from '@/lib/data';

export const metadata: Metadata = { title: 'Pencarian' };

export default function Page() {
  return <div className="space-y-7 py-8">
    <GovPageHeader index="00" title="Pencarian wilayah dan metrik" description="Cari kode wilayah, nama daerah, atau indikator yang tersedia. Hasil hanya mencakup wilayah yang muncul pada CSV yang diberikan." />
    <GovSearch regions={[...provinces, ...kabkota]} metrics={metricDefinitions} />
  </div>;
}
