import type { Metadata } from 'next';
import { GovDashboardView } from '@/components/igs/GovDashboardView';
import { derivedRows, provinces } from '@/lib/data';

export const metadata: Metadata = { title: 'Dashboard wilayah' };

export default function Page() {
  const provinceCodes = new Set(provinces.map((region) => region.kode_wilayah));
  const rows = derivedRows.filter((row) => provinceCodes.has(String(row.kode_wilayah)));
  return <GovDashboardView rows={rows} regions={provinces} />;
}
