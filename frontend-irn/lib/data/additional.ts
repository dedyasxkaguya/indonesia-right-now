import additionalJson from './additional.json';
import { additionalDatasetsSchema, type AdditionalDataset } from './schemas';

const datasets = additionalDatasetsSchema.parse(additionalJson).datasets;

export function getAdditionalDatasets(topic: string): AdditionalDataset[] {
  return datasets.filter((dataset) => dataset.topic === topic);
}
