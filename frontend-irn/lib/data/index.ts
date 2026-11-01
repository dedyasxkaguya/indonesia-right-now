import apbdJson from './apbd.json';
import ekonomiJson from './ekonomi.json';
import governanceJson from './governance.json';
import kabkotaJson from './kabkota.json';
import layananJson from './layanan.json';
import makroJson from './makro.json';
import provincesJson from './provinces.json';
import pbjJson from './pbj.json';
import metricsJson from './derived/metrics.json';
import combinedProvincesJson from './derived/combined/provinces.json';
import combinedKabkota2020Json from './derived/combined/kabkota-2020-2022.json';
import combinedKabkota2023Json from './derived/combined/kabkota-2023-2025.json';
import crossDatasetJson from './derived/cross-dataset.json';
import indexJson from './index.json';
import { apbdSchema, crossDatasetSchema, datasetSchema, ekonomiSchema, governanceSchema, kabkotaSchema, layananSchema, makroSchema, metricIndexSchema, pbjSchema, provincesSchema, type DatasetRow, type MetricDefinition, type Region } from './schemas';
import type { GovMetricId } from './types';
import { getMetricValue } from './format';

export type { GovMetricId, GovYear } from './types';
export { formatValue, getMetricValue } from './format';

function parseRows(value: unknown, schema: typeof datasetSchema = datasetSchema): DatasetRow[] {
  return schema.parse(value).rows;
}

export const datasetRows = {
  ekonomi: parseRows(ekonomiJson, ekonomiSchema),
  pbj: parseRows(pbjJson, pbjSchema),
  layanan: parseRows(layananJson, layananSchema),
  governance: parseRows(governanceJson, governanceSchema),
  apbd: parseRows(apbdJson, apbdSchema),
  makro: parseRows(makroJson, makroSchema),
};

export const provinces: Region[] = provincesSchema.parse(provincesJson).rows;
export const kabkota: Region[] = kabkotaSchema.parse(kabkotaJson).rows;
export const regions: Region[] = [...provinces, ...kabkota];
export const metricDefinitions: MetricDefinition[] = metricIndexSchema.parse(metricsJson).rows;
export const sourceManifest = indexJson;

export const derivedRows: DatasetRow[] = [
  ...parseRows(combinedProvincesJson),
  ...parseRows(combinedKabkota2020Json),
  ...parseRows(combinedKabkota2023Json),
];

export const crossDatasetViews = crossDatasetSchema.parse(crossDatasetJson).rows;

export function getRegion(code: string): Region | undefined {
  return regions.find((region) => region.kode_wilayah === code);
}

export function getRegionRows(code: string): DatasetRow[] {
  return derivedRows
    .filter((row) => row.kode_wilayah === code)
    .sort((a, b) => Number(a.tahun_anggaran) - Number(b.tahun_anggaran));
}

export function getProvincialRows(year: number): DatasetRow[] {
  const codes = new Set(provinces.map((region) => region.kode_wilayah));
  return derivedRows.filter((row) => row.tahun_anggaran === year && codes.has(String(row.kode_wilayah)));
}

export function getMetricRows(metric: GovMetricId, year: number, level: 'provinsi' | 'kabkota' = 'provinsi'): DatasetRow[] {
  const codes = new Set((level === 'provinsi' ? provinces : kabkota).map((region) => region.kode_wilayah));
  return derivedRows
    .filter((row) => row.tahun_anggaran === year && codes.has(String(row.kode_wilayah)))
    .sort((a, b) => (getMetricValue(b, metric) ?? -Infinity) - (getMetricValue(a, metric) ?? -Infinity));
}
