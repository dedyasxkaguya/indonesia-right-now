import bidang from '@/content/igs/bidang.json';
import { GovTopicView } from '@/components/igs/GovTopicView';
import { getAdditionalDatasets } from '@/lib/data/additional';
import { datasetRows, derivedRows, metricDefinitions, provinces } from '@/lib/data';

type TopicSlug = keyof typeof bidang;

export function GovTopicPage({ slug }: { slug: TopicSlug }) {
  const topic = bidang[slug];
  const codes = new Set(provinces.map((region) => region.kode_wilayah));
  const rows = derivedRows.filter((row) => codes.has(String(row.kode_wilayah)));
  const provincialRows = (sourceRows: typeof datasetRows.governance) => sourceRows.filter((row) => codes.has(String(row.kode_wilayah)));
  return <GovTopicView slug={slug} topic={topic} rows={rows} packages={datasetRows.pbj} governanceRows={provincialRows(datasetRows.governance)} apbdRows={provincialRows(datasetRows.apbd)} serviceRows={provincialRows(datasetRows.layanan)} additionalDatasets={getAdditionalDatasets(slug)} regions={provinces} definitions={metricDefinitions} />;
}
