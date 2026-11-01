'use client';

import dynamic from 'next/dynamic';
import { StateCard } from '@/components/ui/StateCard';

const GeoMapBoot = dynamic(() => import('./GeoMapBoot').then((module) => module.GeoMapBoot), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat peta wilayah" description="Geometri diambil dari berkas lokal yang telah disederhanakan." />,
});

export type ChoroplethRow = {
  kode_wilayah: string;
  nama_daerah: string;
  value: number | null;
};

export function GovChoropleth({
  title,
  description,
  data,
  metricLabel,
  unit,
  selectedCode,
  height,
}: {
  title: string;
  description: string;
  data: ChoroplethRow[];
  metricLabel: string;
  unit: string;
  selectedCode?: string;
  height?: number;
}) {
  if (!data.length) return <StateCard variant="empty" title="Data peta belum tersedia" description="Tidak ada nilai untuk dipetakan pada tahun ini." />;
  return <GeoMapBoot title={title} description={description} data={data} metricLabel={metricLabel} unit={unit} selectedCode={selectedCode} height={height} />;
}
