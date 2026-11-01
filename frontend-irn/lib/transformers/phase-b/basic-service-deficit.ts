import type {
  BasicServiceDeficitRow,
  InfrastructureAccessRow,
  MetricResult,
} from '@/lib/types/datasets';
import { createMetricResult, isFiniteNumber } from './shared';

export function computeBasicServiceDeficit(
  access: MetricResult<InfrastructureAccessRow>,
): MetricResult<BasicServiceDeficitRow> {
  if (access.insufficient) {
    return { byProvince: {}, insufficient: true };
  }
  const rows: BasicServiceDeficitRow[] = [];
  let incomplete = false;
  Object.values(access.byProvince).flat().forEach((row) => {
    if (!isFiniteNumber(row.akses_layanan_dasar)) {
      incomplete = true;
      return;
    }
    rows.push({
      kode_wilayah: row.kode_wilayah,
      nama_provinsi: row.nama_provinsi,
      tahun: row.tahun,
      akses_layanan_dasar: row.akses_layanan_dasar,
      defisit_layanan_dasar: 100 - row.akses_layanan_dasar,
    });
  });
  return createMetricResult(rows, incomplete);
}
