'use client';

import type { AdditionalDataset, DatasetRow, Region } from '@/lib/data/schemas';
import type { RegionSelection } from '@/lib/gov/region-selection';
import { filterRowsByRegionSelection, getRegionSelectionName } from '@/lib/gov/region-selection';
import { formatDecimal, formatRupiahByUnit } from '@/lib/utils/format-number';
import { StateCard } from '@/components/ui/StateCard';

function numberAt(row: DatasetRow, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function populationForProvince(
  provinceCode: string,
  year: number,
  populationRows: DatasetRow[],
): number | null {
  const rows = populationRows
    .filter((row) => String(row.kode_wilayah) === provinceCode && Number(row.tahun_anggaran) <= year)
    .sort((a, b) => Number(b.tahun_anggaran) - Number(a.tahun_anggaran));
  return rows.length ? numberAt(rows[0], 'jumlah_penduduk_total_ribu_jiwa') : null;
}

function summarizeMetric(
  rows: DatasetRow[],
  metric: AdditionalDataset['metrics'][number],
  year: number,
  populationRows: DatasetRow[],
): number | null {
  if (metric.aggregation === 'sum' || metric.aggregation === 'count') {
    const values = rows.map((row) => numberAt(row, metric.key)).filter((value): value is number => value !== null);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  }
  const values = rows.flatMap((row) => {
    const value = numberAt(row, metric.key);
    const population = populationForProvince(String(row.kode_wilayah), year, populationRows);
    return value !== null && population !== null && population > 0 ? [{ value, population }] : [];
  });
  if (!values.length) return null;
  const weightTotal = values.reduce((total, item) => total + item.population, 0);
  return weightTotal > 0
    ? values.reduce((total, item) => total + item.value * item.population, 0) / weightTotal
    : null;
}

function formatMetric(value: number | null, unit: string) {
  if (value === null) return 'Data tidak tersedia';
  return unit === 'Rupiah'
    ? formatRupiahByUnit(value, unit)
    : `${formatDecimal(value, 4)}${unit ? ` ${unit}` : ''}`;
}

function getYearCoverage(dataset: AdditionalDataset) {
  if (!dataset.hasTimeDimension) return 'Snapshot tanpa tahun';
  const years = [...new Set(dataset.rows
    .map((row) => row.tahun_anggaran)
    .filter((year): year is number => typeof year === 'number'))]
    .sort((a, b) => a - b);
  return years.length ? `Cakupan ${years[0]}–${years[years.length - 1]}` : 'Cakupan tahun tidak tersedia';
}

export function AdditionalDatasetsPanel({
  datasets,
  year,
  selection,
  regions,
  populationRows,
}: {
  datasets: AdditionalDataset[];
  year: number;
  selection: RegionSelection;
  regions: Region[];
  populationRows: DatasetRow[];
}) {
  if (!datasets.length) return null;

  const selectedName = getRegionSelectionName(selection, regions);
  return (
    <section className="space-y-4 border-t border-paper-300 pt-6">
      <header>
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-500">DATA TAMBAHAN</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
          Agregat provinsi dari dataset lokal. Jumlah dan nilai uang dijumlahkan; rerata nasional/pulau berbobot populasi memakai data tahun terpilih atau tahun terbaru sebelumnya. Grup kecil disembunyikan dan data yang tidak tersedia tidak diimputasi.
        </p>
      </header>
      <div className="grid gap-3">
        {datasets.map((dataset, datasetIndex) => {
          const timeRows = dataset.hasTimeDimension
            ? dataset.rows.filter((row) => row.tahun_anggaran === year)
            : dataset.rows;
          const scopedRows = filterRowsByRegionSelection(timeRows as DatasetRow[], selection, regions);
          const dimensionGroups = new Map<string, { label: string; rows: DatasetRow[] }>();
          for (const row of scopedRows) {
            const values = dataset.dimensions.map((dimension) => row[dimension.key]);
            const key = JSON.stringify(values);
            const label = dataset.dimensions.length
              ? dataset.dimensions.map((dimension, index) => `${dimension.label}: ${String(values[index] ?? 'Tidak diketahui')}`).join(' · ')
              : selectedName;
            const group = dimensionGroups.get(key) ?? { label, rows: [] };
            group.rows.push(row);
            dimensionGroups.set(key, group);
          }
          const groups = [...dimensionGroups.values()];
          const coveredProvinces = new Set(scopedRows.map((row) => String(row.kode_wilayah))).size;

          return (
            <details key={dataset.id} open={datasetIndex === 0} className="group border border-paper-300 bg-paper-50">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold text-ink-900">{dataset.title}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  {getYearCoverage(dataset)} · {coveredProvinces} provinsi
                </span>
              </summary>
              <div className="space-y-4 border-t border-paper-300 p-4">
                <p className="text-sm leading-6 text-ink-600">{dataset.description}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  {dataset.hasTimeDimension ? `Tahun ${year}` : 'Snapshot terbaru'} · {selectedName} · satuan dicantumkan per indikator
                </p>
                {!groups.length ? (
                  <StateCard
                    variant="empty"
                    title="Data belum tersedia untuk cakupan ini"
                    description={`Sumber tidak memiliki baris untuk ${dataset.hasTimeDimension ? `tahun ${year} dan ` : ''}pilihan wilayah ini. Ketiadaan baris bukan nilai nol.`}
                  />
                ) : groups.map((group) => (
                  <div key={group.label} className="border-t border-paper-200 pt-3 first:border-t-0 first:pt-0">
                    {dataset.dimensions.length ? <h3 className="mb-3 text-sm font-semibold text-ink-800">{group.label}</h3> : null}
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {dataset.metrics.map((metric) => (
                        <div key={metric.key} className="border border-paper-200 bg-white p-3">
                          <dt className="text-xs leading-5 text-ink-500">{metric.label}</dt>
                          <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink-900">
                            {formatMetric(summarizeMetric(group.rows, metric, year, populationRows), metric.unit)}
                          </dd>
                          <dd className="mt-1 text-[10px] leading-4 text-ink-500">
                            {metric.aggregation === 'count'
                              ? `Jumlah catatan · ${selectedName}`
                              : metric.aggregation === 'sum'
                                ? `Total agregat · ${selectedName}`
                                : `Rerata provinsi berbobot populasi · ${selectedName}`}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
                <p className="text-xs leading-5 text-ink-500">{dataset.meta.aggregation} Sumber: {dataset.meta.source}.</p>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
