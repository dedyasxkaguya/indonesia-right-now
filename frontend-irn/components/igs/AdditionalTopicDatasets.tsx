import { getAdditionalDatasets } from '@/lib/data/additional';
import { derivedRows, provinces } from '@/lib/data';
import { AdditionalTopicDatasetsClient } from './AdditionalTopicDatasetsClient';

export function AdditionalTopicDatasets({ topic }: { topic: string }) {
  const provinceCodes = new Set(provinces.map((province) => province.kode_wilayah));
  const populationRows = derivedRows.filter((row) => provinceCodes.has(String(row.kode_wilayah)));
  return (
    <AdditionalTopicDatasetsClient
      datasets={getAdditionalDatasets(topic)}
      regions={provinces}
      populationRows={populationRows}
    />
  );
}
