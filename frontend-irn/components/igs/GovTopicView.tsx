'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { GovPageHeader } from './GovPageHeader';
import { MetricTile } from './MetricTile';
import { IgsYearSelector, useGovYear } from './GovYearProvider';
import { GovChoropleth } from './GovChoropleth';
import { formatValue } from '@/lib/data/format';
import type { DatasetRow, MetricDefinition, Region } from '@/lib/data/schemas';
import { StateCard } from '@/components/ui/StateCard';
import { getIgsFormula, getIgsLabel } from '@/lib/igs-labels';
import { NATIONAL_REGION_CODE, populationWeightedMean } from '@/lib/gov/aggregation';
import { formatRupiahByUnit } from '@/lib/utils/format-number';
import { RegionHierarchySelector } from './RegionHierarchySelector';
import { filterRowsByRegionSelection, getRegionSelectionName, NATIONAL_REGION_SELECTION, type RegionSelection } from '@/lib/gov/region-selection';
import { Building2, Cog, DollarSign, GraduationCap, HandHeart, Landmark, Leaf, Map, Wheat } from 'lucide-react';
import { AdditionalDatasetsPanel } from './AdditionalDatasetsPanel';
import type { AdditionalDataset } from '@/lib/data/schemas';

const TopicWatermarkScene = dynamic(() => import('./TopicWatermarkScene').then((module) => module.TopicWatermarkScene), {
  ssr: false,
  loading: () => null,
});

const topicWatermarks = {
  pemerintahan: Landmark,
  ekonomi: DollarSign,
  pendidikan: GraduationCap,
  'sosial-publik': HandHeart,
  daerah: Map,
  infrastruktur: Cog,
  lingkungan: Leaf,
  pangan: Wheat,
} as const;

const GovTopicInventory = dynamic(() => import('./GovTopicInventory').then((module) => module.GovTopicInventory), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat visualisasi" description="Grafik tema dimuat khusus untuk halaman ini." />,
});

type Topic = {
  index: string;
  title: string;
  description: string;
  datasets: string[];
  metrics: string[];
};

const sourceNames: Record<string, string> = {
  ekonomi: 'PDRB dan ketenagakerjaan',
  pbj: 'Pengadaan barang/jasa',
  layanan: 'Fasilitas kesehatan dan pendidikan',
  governance: 'Tata kelola, SPBE, dan SPM',
  apbd: 'APBD',
  makro: 'Indikator makro kesejahteraan',
};

const metricFields: Record<string, { key: string; label: string; unit: string }[]> = {
  pemerintahan: [
    { key: '_derived_governance_digital', label: 'Tata kelola digital', unit: 'skor' },
    { key: '_derived_fiscal_autonomy', label: 'Kemandirian fiskal', unit: '%' },
    { key: '_derived_procurement_efficiency', label: 'Efisiensi pengadaan', unit: '%' },
  ],
  ekonomi: [
    { key: 'pdrb_per_kapita_adhk_ribu_rp', label: 'PDRB per kapita ADHK', unit: 'ribu Rp' },
    { key: '_derived_economic_resilience', label: 'Ketahanan ekonomi', unit: 'indeks relatif' },
    { key: 'tingkat_pengangguran_terbuka_tpt_persen', label: 'Tingkat pengangguran terbuka', unit: '%' },
  ],
  pendidikan: [
    { key: '_derived_education_quality', label: 'Mutu pendidikan', unit: 'indeks relatif' },
    { key: 'persentase_kondisi_gedung_sekolah_layak_persen', label: 'Gedung sekolah layak', unit: '%' },
    { key: 'harapan_lama_sekolah_hls_tahun', label: 'Harapan lama sekolah', unit: 'tahun' },
  ],
  'sosial-publik': [
    { key: 'indeks_pembangunan_manusia_ipm', label: 'Indeks pembangunan manusia', unit: 'poin' },
    { key: 'persentase_penduduk_miskin_persen', label: 'Penduduk miskin', unit: '%' },
    { key: '_derived_social_share', label: 'Porsi belanja sosial', unit: '%' },
  ],
  daerah: [
    { key: '_derived_procurement_efficiency', label: 'Efisiensi pengadaan', unit: '%' },
    { key: '_derived_economic_resilience', label: 'Ketahanan ekonomi', unit: 'indeks relatif' },
    { key: '_derived_capital_share', label: 'Porsi belanja modal', unit: '%' },
  ],
};

function metricValue(row: DatasetRow, field: string) {
  const value = row[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function GovTopicView({
  slug,
  topic,
  rows,
  packages,
  governanceRows,
  apbdRows,
  serviceRows,
  additionalDatasets,
  regions,
  definitions,
}: {
  slug: string;
  topic: Topic;
  rows: DatasetRow[];
  packages: DatasetRow[];
  governanceRows: DatasetRow[];
  apbdRows: DatasetRow[];
  serviceRows: DatasetRow[];
  additionalDatasets: AdditionalDataset[];
  regions: Region[];
  definitions: MetricDefinition[];
}) {
  const { year } = useGovYear();
  const [selection, setSelection] = useState<RegionSelection>(NATIONAL_REGION_SELECTION);
  const scopedRows = filterRowsByRegionSelection(rows, selection, regions);
  const scopedPackages = filterRowsByRegionSelection(packages, selection, regions);
  const scopedGovernanceRows = filterRowsByRegionSelection(governanceRows, selection, regions);
  const scopedApbdRows = filterRowsByRegionSelection(apbdRows, selection, regions);
  const scopedServiceRows = filterRowsByRegionSelection(serviceRows, selection, regions);
  const yearRows = scopedRows.filter((row) => row.tahun_anggaran === year);
  const fields = metricFields[slug] ?? metricFields.pemerintahan;
  const summaries = fields.map((field) => populationWeightedMean(yearRows, field.key));
  const selectedName = getRegionSelectionName(selection, regions);
  const selectedDefinition = definitions.find((definition) => definition.id === topic.metrics[0]);
  const TopicWatermark = topicWatermarks[slug as keyof typeof topicWatermarks] ?? Building2;
  const mapField = slug === 'sosial-publik'
    ? { key: 'indeks_pembangunan_manusia_ipm', label: 'Indeks pembangunan manusia', unit: 'poin' }
    : { key: '_derived_procurement_efficiency', label: 'Efisiensi pengadaan', unit: '%' };
  const mapRows = yearRows.map((row) => ({
    kode_wilayah: String(row.kode_wilayah),
    nama_daerah: String(row.nama_daerah),
    value: metricValue(row, mapField.key),
  }));

  return (
    <div className="space-y-8 py-8">
      <div className="relative isolate overflow-hidden">
        <TopicWatermarkScene slug={slug} />
        <TopicWatermark aria-hidden="true" focusable="false" className="pointer-events-none absolute -right-4 -top-5 z-0 size-36 text-gov-primary opacity-[0.12] sm:size-52" />
        <div className="relative z-10"><GovPageHeader index={topic.index} title={topic.title} description={topic.description} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-paper-300 py-4">
        <div><p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">TAHUN DATA</p><IgsYearSelector expanded /></div>
        <RegionHierarchySelector regions={regions} selection={selection} onChange={setSelection} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {fields.map((field, index) => {
          const value = summaries[index];
          const formatted = field.unit.toLocaleLowerCase('id-ID').includes('rp')
            ? formatRupiahByUnit(value, field.unit)
            : formatValue(value, 4);
          return <MetricTile key={field.key} label={field.label} value={value === null ? 'Data tidak tersedia' : `${formatted}${field.unit.toLocaleLowerCase('id-ID').includes('rp') ? '' : ` ${field.unit}`}`} caption={`${selectedName} berbobot populasi · ${year}`} />;
        })}
      </div>
      {slug === 'sosial-publik' ? <GovChoropleth title={`Peta IPM provinsi · ${year}`} description="Persebaran nilai IPM yang tersedia pada tahun terpilih. Wilayah tanpa geometri atau nilai tetap tercatat pada tabel." data={mapRows} metricLabel={mapField.label} unit={mapField.unit} /> : null}
      {slug === 'daerah' ? <GovChoropleth title={`Peta efisiensi pengadaan · ${year}`} description="Rerata efisiensi kontrak terhadap HPS untuk paket yang memenuhi syarat pada data sumber. Bukan ukuran mutu pekerjaan." data={mapRows} metricLabel={mapField.label} unit={mapField.unit} height={600} /> : null}
      <GovTopicInventory slug={slug} rows={scopedRows} packages={scopedPackages} governanceRows={scopedGovernanceRows} apbdRows={scopedApbdRows} serviceRows={scopedServiceRows} year={year} selectedCode={NATIONAL_REGION_CODE} selectedName={selectedName} />
      <AdditionalDatasetsPanel datasets={additionalDatasets} year={year} selection={selection} regions={regions} populationRows={rows} />
      {selectedDefinition ? <details className="border border-paper-300 bg-paper-50 p-5"><summary className="cursor-pointer font-semibold text-ink-900">Rumus indeks: {getIgsLabel(selectedDefinition.id)}</summary><div className="prose prose-sm mt-4 max-w-none text-ink-700"><pre className="whitespace-pre-wrap font-sans text-sm leading-6">{getIgsFormula(selectedDefinition.formula_doc)}</pre></div></details> : null}
      <section className="border-t border-paper-300 pt-5">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-500">DATASET YANG DIGUNAKAN</h2>
        <div className="mt-3 flex flex-wrap gap-2">{topic.datasets.map((datasetId) => <span key={datasetId} className="border border-gov-primary/30 bg-gov-primarySoft px-3 py-1 font-mono text-xs text-gov-primary">{sourceNames[datasetId] ?? datasetId}</span>)}</div>
        <p className="mt-4 max-w-3xl text-sm text-ink-500">Indikator yang digabungkan menggambarkan pola deskriptif. Kelengkapan wilayah dan tahun mengikuti dataset sumber masing-masing.</p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-gov-primary"><Link href="/gov/analytics">Buka analitik lintas dataset →</Link><Link href="/gov/perbandingan">Bandingkan wilayah →</Link></div>
      </section>
    </div>
  );
}
