import type {
  MetricResult,
  WasteFacilityMetric,
  WasteFacilityRow,
  WasteOvercapacityProvinceRow,
  WasteOvercapacityResult,
} from '@/lib/types/datasets';
import { groupByProvince, isFiniteNumber, provinceYearKey } from './shared';

export function computeWasteOvercapacity(
  facilityRows: readonly WasteFacilityRow[],
): WasteOvercapacityResult {
  const facilities: WasteFacilityMetric[] = [];
  let incomplete = false;
  facilityRows.forEach((row) => {
    if (
      !isFiniteNumber(row.latitude)
      || !isFiniteNumber(row.longitude)
      || !isFiniteNumber(row.sampah_masuk_ton_per_hari)
      || !isFiniteNumber(row.kapasitas_desain_ton_per_hari)
      || row.kapasitas_desain_ton_per_hari <= 0
      || !row.nama_tpa
    ) {
      incomplete = true;
      return;
    }
    const ratio = row.sampah_masuk_ton_per_hari / row.kapasitas_desain_ton_per_hari;
    facilities.push({
      kode_wilayah: row.kode_wilayah,
      kode_provinsi: row.kode_provinsi,
      nama_provinsi: row.nama_provinsi,
      nama_tpa: row.nama_tpa,
      tahun: row.tahun,
      latitude: row.latitude,
      longitude: row.longitude,
      sampah_masuk_ton_per_hari: row.sampah_masuk_ton_per_hari,
      kapasitas_desain_ton_per_hari: row.kapasitas_desain_ton_per_hari,
      rasio_kapasitas: ratio,
      overcapacity: ratio > 1,
    });
  });

  const grouped = new Map<string, WasteFacilityMetric[]>();
  facilities.forEach((facility) => {
    const key = provinceYearKey(facility.kode_provinsi, facility.tahun);
    const group = grouped.get(key) ?? [];
    group.push(facility);
    grouped.set(key, group);
  });
  const rows: WasteOvercapacityProvinceRow[] = [];
  grouped.forEach((group, key) => {
    rows.push({
      kode_wilayah: group[0].kode_provinsi,
      nama_provinsi: group[0].nama_provinsi,
      tahun: group[0].tahun,
      jumlah_tpa_overcapacity: group.filter((facility) => facility.overcapacity).length,
      rasio_maksimum: Math.max(...group.map((facility) => facility.rasio_kapasitas)),
      jumlah_tpa_terukur: group.length,
    });
  });
  const result: MetricResult<WasteOvercapacityProvinceRow> = incomplete || rows.length === 0
    ? { byProvince: {}, insufficient: true }
    : { byProvince: groupByProvince(rows), insufficient: false };
  return {
    ...result,
    facilities: incomplete ? [] : facilities,
  };
}
