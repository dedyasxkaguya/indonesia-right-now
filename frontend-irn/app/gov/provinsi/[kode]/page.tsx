import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GovEntityPage } from '@/components/igs/GovEntityPage';
import { datasetRows, derivedRows, getRegion, kabkota, provinces } from '@/lib/data';

export const dynamicParams = false;

export function generateStaticParams() {
  return provinces.map((region) => ({ kode: region.kode_wilayah }));
}

export async function generateMetadata({ params }: { params: { kode: string } }): Promise<Metadata> {
  const region = getRegion(params.kode);
  return { title: region ? `${region.nama_daerah} · Provinsi` : 'Provinsi' };
}

export default function ProvinceDetailPage({ params }: { params: { kode: string } }) {
  const region = provinces.find((item) => item.kode_wilayah === params.kode);
  if (!region) notFound();
  const history = derivedRows.filter((row) => row.kode_wilayah === region.kode_wilayah).sort((a, b) => Number(a.tahun_anggaran) - Number(b.tahun_anggaran));
  const provinceCodes = new Set(provinces.map((item) => item.kode_wilayah));
  const provinceRows = derivedRows.filter((row) => provinceCodes.has(String(row.kode_wilayah)));
  const datasets = Object.fromEntries(Object.entries(datasetRows).map(([id, rows]) => [id, rows.filter((row) => row.kode_wilayah === region.kode_wilayah)]));
  const siblings = kabkota.filter((item) => item.provinsi === region.nama_daerah);
  const comparisonCode = provinces.find((item) => item.kode_wilayah !== region.kode_wilayah)?.kode_wilayah ?? region.kode_wilayah;
  return <GovEntityPage region={region} history={history} datasets={datasets} siblings={siblings} comparisonCode={comparisonCode} provinceRows={provinceRows} />;
}
