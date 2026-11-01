import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GovEntityPage } from '@/components/igs/GovEntityPage';
import { datasetRows, derivedRows, getRegion, kabkota, provinces } from '@/lib/data';

export const dynamicParams = false;

export function generateStaticParams() {
  return kabkota.map((region) => ({ kode: region.kode_wilayah }));
}

export async function generateMetadata({ params }: { params: { kode: string } }): Promise<Metadata> {
  const region = getRegion(params.kode);
  return { title: region ? `${region.nama_daerah} · Kabupaten/Kota` : 'Kabupaten/Kota' };
}

export default function KabkotaDetailPage({ params }: { params: { kode: string } }) {
  const region = kabkota.find((item) => item.kode_wilayah === params.kode);
  if (!region) notFound();
  const history = derivedRows.filter((row) => row.kode_wilayah === region.kode_wilayah).sort((a, b) => Number(a.tahun_anggaran) - Number(b.tahun_anggaran));
  const datasets = Object.fromEntries(Object.entries(datasetRows).map(([id, rows]) => [id, rows.filter((row) => row.kode_wilayah === region.kode_wilayah)]));
  const siblings = kabkota.filter((item) => item.provinsi === region.provinsi && item.kode_wilayah !== region.kode_wilayah);
  const comparisonCode = provinces.find((item) => item.nama_daerah === region.provinsi)?.kode_wilayah ?? provinces[0]?.kode_wilayah ?? region.kode_wilayah;
  return <GovEntityPage region={region} history={history} datasets={datasets} siblings={siblings} comparisonCode={comparisonCode} />;
}
