'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useGovYear, IgsYearSelector } from './GovYearProvider';
import { MetricChart } from './MetricChart';
import { MetricTile } from './MetricTile';
import { GovChoropleth } from './GovChoropleth';
import { StateCard } from '@/components/ui/StateCard';
import { formatValue, getMetricValue } from '@/lib/data/format';
import type { DatasetRow, Region } from '@/lib/data/schemas';
import { getIgsLabel } from '@/lib/igs-labels';

const datasetOrder = ['ekonomi', 'apbd', 'makro', 'layanan', 'governance', 'pbj'] as const;
const datasetLabels: Record<(typeof datasetOrder)[number], string> = {
  ekonomi: 'PDRB dan ketenagakerjaan',
  apbd: 'APBD',
  makro: 'Kesejahteraan makro',
  layanan: 'Fasilitas layanan publik',
  governance: 'Tata kelola',
  pbj: 'Pengadaan barang/jasa',
};

function rawText(value: string | number | null) {
  return value === null ? '—' : String(value);
}

export function GovEntityPage({
  region,
  history,
  datasets,
  siblings,
  comparisonCode,
  provinceRows,
}: {
  region: Region;
  history: DatasetRow[];
  datasets: Record<string, DatasetRow[]>;
  siblings: Region[];
  comparisonCode: string;
  provinceRows?: DatasetRow[];
}) {
  const { year } = useGovYear();
  const [tableQuery, setTableQuery] = useState('');
  const current = history.find((row) => row.tahun_anggaran === year);
  const trend = history.map((row) => ({ ...row, year: row.tahun_anggaran }));
  const peerMapRows = (provinceRows ?? [])
    .filter((row) => row.tahun_anggaran === year)
    .map((row) => ({
      kode_wilayah: String(row.kode_wilayah),
      nama_daerah: String(row.nama_daerah),
      value: getMetricValue(row, 'composite_development_score'),
    }));
  const filteredByDataset = useMemo(() => Object.fromEntries(datasetOrder.map((id) => {
    const data = datasets[id] ?? [];
    const query = tableQuery.toLocaleLowerCase('id');
    return [id, query ? data.filter((row) => Object.values(row).some((value) => String(value ?? '').toLocaleLowerCase('id').includes(query))) : data];
  })), [datasets, tableQuery]);

  return (
    <div className="space-y-8 py-8">
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-ink-500"><Link href="/gov" className="hover:text-gov-primary">Gov</Link><span className="mx-2">·</span><span>{region.tingkat_pemerintahan}</span><span className="mx-2">·</span>{region.nama_daerah}</nav>
      <header className="border-b border-paper-300 pb-6">
        <p className="font-mono text-eyebrow uppercase text-gov-primary">{region.pulau_kawasan} · DATA TAHUNAN 2020–2025</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div><h1 className="font-sans text-4xl font-bold text-ink-900 sm:text-5xl">{region.nama_daerah}</h1><p className="mt-2 font-mono text-sm text-ink-500">Kode wilayah · {region.kode_wilayah}</p></div>
          <IgsYearSelector expanded />
        </div>
      </header>
      {current ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={`IPM · ${year}`} value={formatValue(typeof current.indeks_pembangunan_manusia_ipm === 'number' ? current.indeks_pembangunan_manusia_ipm : null)} caption="Sumber: indikator makro kesejahteraan." />
        <MetricTile label={`Kemiskinan · ${year}`} value={typeof current.persentase_penduduk_miskin_persen === 'number' ? `${formatValue(current.persentase_penduduk_miskin_persen)}%` : 'Data tidak tersedia'} caption="Persentase penduduk miskin dari dataset makro." />
        <MetricTile label={`Kemandirian fiskal · ${year}`} value={getMetricValue(current, 'fiscal_autonomy') === null ? 'Data tidak tersedia' : `${formatValue(getMetricValue(current, 'fiscal_autonomy'))}%`} caption="PAD terealisasi / pendapatan terealisasi." />
        <MetricTile label={`Indeks pembangunan · ${year}`} value={formatValue(getMetricValue(current, 'composite_development_score'), 2)} caption="Nilai relatif gabungan untuk perbandingan, bukan ukuran mutu absolut." />
      </div> : <StateCard variant="empty" title={`Data ${year} belum tersedia`} description="Tahun ini tidak memiliki baris gabungan untuk wilayah tersebut. Pilih tahun lain atau tinjau dataset yang tersedia." />}
      {region.tingkat_pemerintahan === 'Provinsi' ? <GovChoropleth title={`Peta indeks pembangunan provinsi · ${year}`} description="Indeks gabungan untuk membandingkan provinsi; provinsi yang sedang dibuka disorot. Peta bukan peringkat mutu absolut." data={peerMapRows} metricLabel="Indeks pembangunan gabungan" unit="indeks relatif" selectedCode={region.kode_wilayah} /> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <MetricChart title="Lintasan indeks pembangunan" description="Perubahan indeks relatif lintas tahun; angka yang tidak tersedia tetap dibiarkan kosong." data={trend} xKey="year" yKey="_derived_composite_development_score" kind="line" unit="indeks relatif" />
        <MetricChart title="IPM dan tingkat kemiskinan" description="Perbandingan deskriptif dua indikator makro yang tersedia." data={trend} xKey="indeks_pembangunan_manusia_ipm" yKey="persentase_penduduk_miskin_persen" kind="scatter" />
      </div>
      <section>
        <h2 className="font-sans text-2xl font-semibold text-ink-900">Dataset wilayah</h2>
        <label className="mt-3 block max-w-xl font-mono text-[10px] uppercase tracking-wider text-ink-500">Cari di tabel
          <input value={tableQuery} onChange={(event) => setTableQuery(event.target.value)} type="search" placeholder="Cari nama kolom atau nilai…" className="mt-2 min-h-10 w-full border border-paper-300 bg-paper-50 px-3 font-sans text-sm normal-case tracking-normal text-ink-900 focus:border-gov-primary" />
        </label>
        <div className="mt-4 space-y-3">
          {datasetOrder.map((datasetId) => {
            const rawRows = datasets[datasetId] ?? [];
            const shownRows = filteredByDataset[datasetId] ?? [];
            return <details key={datasetId} className="border border-paper-300 bg-paper-50">
              <summary className="cursor-pointer px-4 py-3 font-semibold text-ink-900">{datasetLabels[datasetId]} <span className="ml-2 font-mono text-xs font-normal text-ink-500">{rawRows.length} baris</span></summary>
              {rawRows.length ? <div className="overflow-auto border-t border-paper-200">
                <table className="min-w-full text-left text-xs">
                  <thead><tr className="bg-paper-100">{Object.keys(rawRows[0]).slice(0, 9).map((field) => <th key={field} className="whitespace-nowrap px-3 py-2 font-mono font-normal text-ink-500">{getIgsLabel(field)}</th>)}</tr></thead>
                  <tbody>{shownRows.map((row, index) => <tr key={`${datasetId}-${index}`} className="border-t border-paper-200">{Object.keys(rawRows[0]).slice(0, 9).map((field) => <td key={field} className="max-w-56 truncate whitespace-nowrap px-3 py-2">{rawText(row[field] ?? null)}</td>)}</tr>)}</tbody>
                </table>
                <p className="p-3 text-xs text-ink-500">Baris yang ditampilkan berasal dari dataset {datasetLabels[datasetId]}; kolom mengikuti nama indikator dan satuan sumber.</p>
                {!shownRows.length ? <p className="p-3 text-xs text-ink-500">Tidak ada baris yang cocok dengan pencarian.</p> : null}
              </div> : <div className="p-4"><StateCard variant="empty" title="Dataset tidak memuat wilayah ini" description="Ketiadaan baris bukan nilai nol." /></div>}
            </details>;
          })}
        </div>
      </section>
      {siblings.length ? <section className="border-t border-paper-300 pt-5">
        <h2 className="font-sans text-xl font-semibold text-ink-900">Kabupaten/kota dalam provinsi ini</h2>
        <div className="mt-3 flex flex-wrap gap-2">{siblings.map((sibling) => <Link key={sibling.kode_wilayah} href={`/gov/kabkota/${encodeURIComponent(sibling.kode_wilayah)}`} className="border border-paper-300 bg-paper-50 px-3 py-2 text-sm hover:border-gov-primary hover:text-gov-primary">{sibling.nama_daerah}</Link>)}</div>
      </section> : null}
      <Link href={`/gov/perbandingan?wilayah=${encodeURIComponent(`${region.kode_wilayah},${comparisonCode}`)}`} className="inline-flex border border-gov-primary px-4 py-3 text-sm font-semibold text-gov-primary hover:bg-gov-primary hover:text-paper-50">Bandingkan dengan wilayah lain →</Link>
    </div>
  );
}
