import type { Metadata } from 'next';
import { GovComparisonView } from '@/components/igs/GovComparisonView';
import { derivedRows, provinces } from '@/lib/data';

export const metadata: Metadata = { title: 'Perbandingan wilayah' };

export default function Page() {
  const provinceCodes = new Set(provinces.map((region) => region.kode_wilayah));
  const rows = derivedRows.filter((row) => provinceCodes.has(String(row.kode_wilayah)));
  const defaults = [...rows]
    .filter((row) => row.tahun_anggaran === 2025 && typeof row.jumlah_penduduk_total_ribu_jiwa === 'number')
    .sort((a, b) => Number(b.jumlah_penduduk_total_ribu_jiwa) - Number(a.jumlah_penduduk_total_ribu_jiwa))
    .slice(0, 3)
    .map((row) => String(row.kode_wilayah));
  return <GovComparisonView regions={provinces} rows={rows} defaults={defaults} />;
}
