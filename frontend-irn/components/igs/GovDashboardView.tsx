'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { GovPageHeader } from './GovPageHeader';
import { MetricChart } from './MetricChart';
import { MetricTile } from './MetricTile';
import { IgsYearSelector, useGovYear } from './GovYearProvider';
import { formatValue, getMetricValue } from '@/lib/data/format';
import type { DatasetRow, Region } from '@/lib/data/schemas';
import { StateCard } from '@/components/ui/StateCard';
import { populationWeightedMean } from '@/lib/gov/aggregation';
import { RegionHierarchySelector } from './RegionHierarchySelector';
import { filterRowsByRegionSelection, getRegionSelectionName, NATIONAL_REGION_SELECTION, type RegionSelection } from '@/lib/gov/region-selection';

const TemporalArchipelagoScene = dynamic(() => import('./TemporalArchipelagoScene').then((module) => module.TemporalArchipelagoScene), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat scene kepulauan" description="Scene tiga dimensi dimuat khusus untuk dashboard." />,
});

export function GovDashboardView({ rows, regions }: { rows: DatasetRow[]; regions: Region[] }) {
  const { year } = useGovYear();
  const [selection, setSelection] = useState<RegionSelection>(NATIONAL_REGION_SELECTION);
  const regionMap = useMemo(() => new Map(regions.map((region) => [region.kode_wilayah, region])), [regions]);
  const scopedRows = filterRowsByRegionSelection(rows, selection, regions);
  const current = scopedRows.filter((row) => row.tahun_anggaran === year);
  const selectionName = getRegionSelectionName(selection, regions);
  const sorted = [...current].sort((a, b) => (getMetricValue(b, 'composite_development_score') ?? -Infinity) - (getMetricValue(a, 'composite_development_score') ?? -Infinity));
  const trend = [2020, 2021, 2022, 2023, 2024, 2025].map((targetYear) => {
    const annual = scopedRows.filter((row) => row.tahun_anggaran === targetYear);
    return {
      tahun_anggaran: targetYear,
      ipm: populationWeightedMean(annual, 'indeks_pembangunan_manusia_ipm'),
      fiskal: populationWeightedMean(annual, '_derived_fiscal_autonomy'),
      layanan: populationWeightedMean(annual, '_derived_service_access_index'),
    };
  });
  const accessMean = populationWeightedMean(current, '_derived_service_access_index');
  const fiscalMean = populationWeightedMean(current, '_derived_fiscal_autonomy');
  const welfareMean = populationWeightedMean(current, '_derived_welfare_composite');
  const scatter = current.filter((row) => getMetricValue(row, 'fiscal_autonomy') !== null && getMetricValue(row, 'welfare_composite') !== null);
  const budgetRows = [...current].sort((a, b) => (typeof b.realisasi_belanja_total === 'number' ? b.realisasi_belanja_total : -Infinity) - (typeof a.realisasi_belanja_total === 'number' ? a.realisasi_belanja_total : -Infinity)).slice(0, 12);

  return (
    <div className="space-y-8 py-8">
      <GovPageHeader index="00" title="Dashboard wilayah" description="Ringkasan indikator lintas dataset dengan filter tahun dan wilayah. Setiap hasil mengikuti cakupan sumber yang tersedia." />
      <div className="flex flex-wrap items-end justify-between gap-5 border-y border-paper-300 py-4">
        <div><p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-500">TAHUN</p><IgsYearSelector expanded /></div>
        <RegionHierarchySelector regions={regions} selection={selection} onChange={setSelection} />
        <Link href="/gov/pencarian" className="text-sm font-semibold text-gov-primary">Cari wilayah →</Link>
      </div>
      <TemporalArchipelagoScene rows={scopedRows} regions={regions} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Wilayah dengan data" value={`${current.length} wilayah`} caption={`${selectionName} · baris wilayah untuk ${year}.`} />
        <MetricTile label="Rerata kemandirian fiskal" value={fiscalMean === null ? 'Data tidak tersedia' : `${formatValue(fiscalMean)}%`} caption={`${selectionName} · PAD terealisasi dibanding pendapatan total terealisasi.`} />
        <MetricTile label="Rerata akses layanan" value={formatValue(accessMean, 4)} caption="Skor-z berbobot populasi dari akses kesehatan, dokter, dan sekolah." />
        <MetricTile label="Rerata kesejahteraan" value={formatValue(welfareMean, 4)} caption="Skor-z berbobot populasi dari IPM, kemiskinan, Gini, dan TPT." />
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <MetricChart className="lg:col-span-8" title={`Lintasan indikator · ${selectionName}`} description="Rerata berbobot populasi pada cakupan terpilih. IPM memakai skala poin; dua indeks lain berupa komposit relatif." data={trend} xKey="tahun_anggaran" yKey="ipm" kind="line" unit="poin" />
        <section className="border border-paper-300 bg-paper-50 p-5 lg:col-span-4">
          <h2 className="font-sans text-h3 text-ink-900">Urutan skor gabungan</h2>
          <p className="mt-1 text-caption text-ink-500">Sepuluh wilayah tertinggi pada skor pembangunan gabungan (skor-z) tahun terpilih.</p>
          <ol className="mt-4 divide-y divide-paper-200">
            {sorted.slice(0, 10).map((row, index) => <li key={String(row.kode_wilayah)}><Link href={`/gov/provinsi/${encodeURIComponent(String(row.kode_wilayah))}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-gov-primary"><span className="flex min-w-0 items-center gap-3"><span className="font-mono text-xs text-ink-400">{String(index + 1).padStart(2, '0')}</span><span className="truncate text-sm">{regionMap.get(String(row.kode_wilayah))?.nama_daerah ?? row.nama_daerah}</span></span><span className="font-mono text-xs text-gov-primary">{formatValue(getMetricValue(row, 'composite_development_score'), 2)}</span></Link></li>)}
          </ol>
        </section>
        <MetricChart className="lg:col-span-7" title="Kemandirian fiskal × kesejahteraan" description="Sumbu X: PAD terealisasi / pendapatan total (%). Sumbu Y: komposit kesejahteraan (skor-z); pola bersifat deskriptif dan tidak menyiratkan kausalitas." data={scatter} xKey="_derived_fiscal_autonomy" yKey="_derived_welfare_composite" kind="scatter" unit="skor-z" />
        <MetricChart className="lg:col-span-5" title="Realisasi belanja total" description={`Wilayah teratas berdasarkan nominal realisasi belanja. Grafik memakai nilai compact Rupiah; tabel menampilkan digit penuh. Satuan sumber: ${String(budgetRows[0]?.satuan_nilai ?? 'Rupiah')}.`} data={budgetRows} xKey="nama_daerah" yKey="realisasi_belanja_total" kind="bar" currencyUnit={String(budgetRows[0]?.satuan_nilai ?? 'Rupiah')} color="#B45309" barColors={['#0E4A6F', '#065F46', '#1E40AF', '#B45309', '#6B21A8']} />
        <MetricChart className="lg:col-span-12" title="IPM lintas tahun" description="Rerata provinsi tahunan dari indikator makro; tahun tanpa data tidak diisi dengan angka pengganti." data={trend} xKey="tahun_anggaran" yKey="ipm" kind="area" unit="poin" />
      </div>
    </div>
  );
}
