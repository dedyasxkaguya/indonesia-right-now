import { z } from 'zod';

export const scalarSchema = z.union([z.string(), z.number().finite(), z.null()]);

export const datasetSchema = z.object({
  rows: z.array(z.record(z.string(), scalarSchema)),
  meta: z.object({
    fields: z.array(z.string()),
    units: z.record(z.string(), z.string()),
    source: z.string(),
  }),
});

export const ekonomiSchema = datasetSchema;
export const pbjSchema = datasetSchema;
export const layananSchema = datasetSchema;
export const governanceSchema = datasetSchema;
export const apbdSchema = datasetSchema;
export const makroSchema = datasetSchema;

export const regionSchema = z.object({
  kode_wilayah: z.string(),
  nama_daerah: z.string(),
  provinsi: z.string(),
  pulau_kawasan: z.string(),
  tingkat_pemerintahan: z.string(),
});

const regionListSchema = z.object({
  rows: z.array(regionSchema),
  meta: z.object({ fields: z.array(z.string()), units: z.record(z.string(), z.string()), source: z.string() }),
});

export const provincesSchema = regionListSchema;
export const kabkotaSchema = regionListSchema;

export const metricSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string(),
  formula_doc: z.string(),
  higher_is_better: z.boolean().nullable(),
  decimals: z.number().int().nonnegative(),
});

export const metricIndexSchema = z.object({
  rows: z.array(metricSchema),
  meta: z.object({ fields: z.array(z.string()), units: z.record(z.string(), z.string()), source: z.string() }),
});

export const crossDatasetSchema = z.object({
  rows: z.array(z.object({
    id: z.string(),
    title: z.string(),
    x_metric: z.string(),
    y_metric: z.string(),
    rows: z.array(z.record(z.string(), scalarSchema)),
  })),
  meta: z.object({
    fields: z.array(z.string()),
    units: z.record(z.string(), z.string()),
    source: z.string(),
  }),
});

export const additionalMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string(),
  aggregation: z.enum(['count', 'sum', 'mean', 'weightedMean']),
  numeratorField: z.string().optional(),
  denominatorField: z.string().optional(),
});

export const additionalDatasetSchema = z.object({
  id: z.string(),
  topic: z.string(),
  title: z.string(),
  description: z.string(),
  dimensions: z.array(z.object({ key: z.string(), label: z.string() })),
  hasTimeDimension: z.boolean(),
  metrics: z.array(additionalMetricSchema),
  rows: z.array(z.record(z.string(), scalarSchema)),
  meta: z.object({
    fields: z.array(z.string()),
    units: z.record(z.string(), z.string()),
    source: z.string(),
    aggregation: z.string(),
    inputRows: z.number().int().nonnegative(),
    outputRows: z.number().int().nonnegative(),
    suppressedGroups: z.number().int().nonnegative(),
  }),
});

export const additionalDatasetsSchema = z.object({
  datasets: z.array(additionalDatasetSchema),
  meta: z.object({ source: z.string() }),
});

export type DatasetRow = Record<string, string | number | null>;

export type Region = z.infer<typeof regionSchema>;
export type MetricDefinition = z.infer<typeof metricSchema>;
export type AdditionalDataset = z.infer<typeof additionalDatasetSchema>;
