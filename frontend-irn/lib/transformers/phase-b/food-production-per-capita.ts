import type {
  AgricultureRow,
  FoodProductionPerCapitaRow,
  MetricResult,
  PopulationRow,
} from '@/lib/types/datasets';
import { createMetricResult, isFiniteNumber, provinceYearKey } from './shared';

type CommodityProduction = {
  padi?: number | null;
  beras?: number | null;
  nama_provinsi: string;
  tahun: number;
};

export function computeFoodProductionPerCapita(
  agricultureRows: readonly AgricultureRow[],
  populationRows: readonly PopulationRow[],
): MetricResult<FoodProductionPerCapitaRow> {
  const populationByKey = new Map(populationRows.map((row) => [
    provinceYearKey(row.kode_wilayah, row.tahun_anggaran),
    row.jumlah_penduduk_total_ribu_jiwa,
  ]));
  const productionByKey = new Map<string, CommodityProduction>();
  agricultureRows.forEach((row) => {
    if (row.komoditas !== 'Padi' && row.komoditas !== 'Beras') return;
    const key = provinceYearKey(row.kode_wilayah, row.tahun);
    const group = productionByKey.get(key) ?? { nama_provinsi: row.nama_provinsi, tahun: row.tahun };
    if (row.komoditas === 'Padi') group.padi = row.produksi_ton;
    if (row.komoditas === 'Beras') group.beras = row.produksi_ton;
    productionByKey.set(key, group);
  });

  const rows: FoodProductionPerCapitaRow[] = [];
  let incomplete = false;
  productionByKey.forEach((production, key) => {
    if (production.padi === undefined || production.beras === undefined) return;
    const population = populationByKey.get(key);
    if (
      !isFiniteNumber(production.padi)
      || !isFiniteNumber(production.beras)
      || !isFiniteNumber(population)
      || population <= 0
    ) {
      incomplete = true;
      return;
    }
    rows.push({
      kode_wilayah: key.split('::')[0],
      nama_provinsi: production.nama_provinsi,
      tahun: production.tahun,
      produksi_padi_per_kapita: production.padi / (population * 1000),
      produksi_beras_per_kapita: production.beras / (population * 1000),
      produksi_padi_ton: production.padi,
      produksi_beras_ton: production.beras,
      jumlah_penduduk_ribu_jiwa: population,
    });
  });
  return createMetricResult(rows, incomplete);
}
