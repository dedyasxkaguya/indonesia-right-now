'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GovPageHeader } from './GovPageHeader';
import { MetricChart } from './MetricChart';
import { IgsYearSelector, useGovYear } from './GovYearProvider';
import { formatValue, getMetricValue } from '@/lib/data/format';
import type { DatasetRow, Region } from '@/lib/data/schemas';

const fields = [
  { label: 'Indeks pembangunan gabungan', derived: 'composite_development_score', raw: '' },
  { label: 'Kemandirian fiskal (%)', derived: 'fiscal_autonomy', raw: '' },
  { label: 'IPM', derived: '', raw: 'indeks_pembangunan_manusia_ipm' },
  { label: 'Penduduk miskin (%)', derived: '', raw: 'persentase_penduduk_miskin_persen' },
  { label: 'Akses layanan', derived: 'service_access_index', raw: '' },
  { label: 'Ketahanan ekonomi', derived: 'economic_resilience', raw: '' },
  { label: 'Efisiensi pengadaan (%)', derived: 'procurement_efficiency', raw: '' },
];

export function GovComparisonView({ regions, rows, defaults }: { regions: Region[]; rows: DatasetRow[]; defaults: string[] }) {
  const { year } = useGovYear();
  const searchParams = useSearchParams();
  const queryCodes = (searchParams?.get('wilayah') ?? '').split(',').filter(Boolean);
  const initial = queryCodes.length ? queryCodes.slice(0, 6) : defaults.slice(0, 3);
  const [selected, setSelected] = useState(initial);
  const current = rows.filter((row) => row.tahun_anggaran === year && selected.includes(String(row.kode_wilayah)));
  const names = new Map(regions.map((region) => [region.kode_wilayah, region.nama_daerah]));
  const chartRows = current.map((row) => ({ ...row, label: names.get(String(row.kode_wilayah)) ?? String(row.nama_daerah) }));

  function value(row: DatasetRow, field: typeof fields[number]) {
    if (field.derived) return getMetricValue(row, field.derived as Parameters<typeof getMetricValue>[1]);
    const raw = row[field.raw];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  }

  return (
    <div className="space-y-8 py-8">
      <GovPageHeader index="00" title="Perbandingan wilayah" description="Bandingkan dua hingga enam provinsi pada indikator yang sama. Nilai kosong tetap ditampilkan sebagai data yang tidak tersedia." />
      <div className="flex flex-wrap items-end justify-between gap-5 border-y border-paper-300 py-4">
        <div><p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-500">TAHUN</p><IgsYearSelector expanded /></div>
        <label className="flex min-w-[min(100%,520px)] flex-col gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-500">Pilih 2–6 provinsi
          <select multiple size={5} value={selected} onChange={(event) => {
            const values = Array.from(event.currentTarget.selectedOptions, (option) => option.value);
            if (values.length <= 6) setSelected(values);
          }} className="min-h-28 border border-paper-300 bg-paper-50 px-3 py-2 font-sans text-sm normal-case tracking-normal text-ink-900 focus:border-gov-primary">
            {regions.map((region) => <option key={region.kode_wilayah} value={region.kode_wilayah}>{region.nama_daerah} · {region.kode_wilayah}</option>)}
          </select>
        </label>
      </div>
      {selected.length < 2 ? <p className="border border-amber-500/40 bg-amber-50 p-4 text-sm text-ink-700">Pilih sedikitnya dua provinsi untuk melihat perbandingan.</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {selected.map((code) => <div key={code} className="border-l-2 border-gov-primary bg-paper-50 px-4 py-3"><p className="font-semibold text-ink-900">{names.get(code) ?? code}</p><p className="font-mono text-xs text-ink-500">{code} · {year}</p><p className="mt-2 font-mono text-sm text-gov-primary">{formatValue(getMetricValue(current.find((row) => String(row.kode_wilayah) === code) ?? {}, 'composite_development_score'), 2)} · indeks relatif</p></div>)}
      </div>
      <MetricChart title="Indeks pembangunan gabungan" description={`Nilai relatif lintas provinsi untuk ${year}; bukan peringkat mutu absolut.`} data={chartRows} xKey="label" yKey="_derived_composite_development_score" kind="bar" />
      <MetricChart title="IPM × kemiskinan" description="Perbandingan dua indikator makro; hubungan yang terlihat bersifat deskriptif." data={chartRows} xKey="indeks_pembangunan_manusia_ipm" yKey="persentase_penduduk_miskin_persen" kind="scatter" color="#0891B2" />
      <section>
        <h2 className="font-sans text-2xl font-semibold text-ink-900">Tabel perbedaan</h2>
        <div className="mt-3 overflow-auto border border-paper-300 bg-paper-50">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-paper-100"><tr><th className="p-3">Metrik</th>{selected.map((code) => <th key={code} className="p-3 font-mono text-xs">{names.get(code) ?? code}</th>)}</tr></thead>
            <tbody>{fields.map((field) => <tr key={field.label} className="border-t border-paper-200"><th className="p-3 font-medium">{field.label}</th>{selected.map((code) => {
              const row = current.find((item) => String(item.kode_wilayah) === code);
              const metric = row ? value(row, field) : null;
              return <td key={code} className="p-3 font-mono text-xs">{formatValue(metric, 2)}</td>;
            })}</tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-500">Nilai indeks merupakan hasil rumus yang dijelaskan pada halaman Analitik. Warna tidak digunakan untuk menyembunyikan nilai atau missing data.</p>
      </section>
    </div>
  );
}
