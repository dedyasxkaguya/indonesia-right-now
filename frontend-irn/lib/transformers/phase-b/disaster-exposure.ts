import type {
  DisasterExposureRow,
  DisasterRow,
  MetricResult,
  PopulationRow,
} from '@/lib/types/datasets';
import { createMetricResult, isFiniteNumber, provinceYearKey } from './shared';

export function computeDisasterExposure(
  disasterRows: readonly DisasterRow[],
  populationRows: readonly PopulationRow[],
): MetricResult<DisasterExposureRow> {
  const populationByKey = new Map(populationRows.map((row) => [
    provinceYearKey(row.kode_wilayah, row.tahun_anggaran),
    row,
  ]));
  const grouped = new Map<string, {
    kode_wilayah: string;
    nama_provinsi: string;
    tahun: number;
    displaced: number;
    severeDamage: number;
    complete: boolean;
  }>();
  disasterRows.forEach((row) => {
    const key = provinceYearKey(row.kode_wilayah, row.tahun);
    const group = grouped.get(key) ?? {
      kode_wilayah: row.kode_wilayah,
      nama_provinsi: row.nama_provinsi,
      tahun: row.tahun,
      displaced: 0,
      severeDamage: 0,
      complete: true,
    };
    if (!isFiniteNumber(row.korban_menderita_mengungsi) || !isFiniteNumber(row.rumah_rusak_berat)) {
      group.complete = false;
    } else {
      group.displaced += row.korban_menderita_mengungsi;
      group.severeDamage += row.rumah_rusak_berat;
    }
    grouped.set(key, group);
  });

  const rows: DisasterExposureRow[] = [];
  let incomplete = false;
  grouped.forEach((group, key) => {
    const population = populationByKey.get(key)?.jumlah_penduduk_total_ribu_jiwa;
    if (!group.complete || !isFiniteNumber(population) || population <= 0) {
      incomplete = true;
      return;
    }
    rows.push({
      kode_wilayah: group.kode_wilayah,
      nama_provinsi: group.nama_provinsi,
      tahun: group.tahun,
      indeks_paparan_bencana: ((group.displaced + 5 * group.severeDamage) / (population * 1000)) * 1000,
      korban_mengungsi: group.displaced,
      rumah_rusak_berat: group.severeDamage,
      jumlah_penduduk_ribu_jiwa: population,
    });
  });
  return createMetricResult(rows, incomplete);
}
