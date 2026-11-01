'use client';

import { useId } from 'react';
import { useEffect, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartPanel, type ChartTableRow } from './EChartPanel';
import type { DatasetRow } from '@/lib/data/schemas';
import type { GeoCollection } from '@/lib/data/geo-types';
import { echarts } from './echarts-runtime';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { StateCard } from '@/components/ui/StateCard';
import { getIgsLabel } from '@/lib/igs-labels';
import { NATIONAL_REGION_CODE, populationWeightedMean } from '@/lib/gov/aggregation';
import { formatDecimal, formatRupiahByUnit } from '@/lib/utils/format-number';

type Props = {
  slug: string;
  rows: DatasetRow[];
  packages: DatasetRow[];
  governanceRows?: DatasetRow[];
  apbdRows?: DatasetRow[];
  serviceRows?: DatasetRow[];
  year: number;
  selectedCode: string;
  selectedName: string;
};

function numberAt(row: DatasetRow, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function GoverningCharts({ rows, year, selectedCode, selectedName }: Omit<Props, 'slug' | 'packages'>) {
  const current = rows.filter((row) => row.tahun_anggaran === year);
  const selected = selectedCode === NATIONAL_REGION_CODE
    ? {
      indeks_spbe_skala_1_sampai_5: populationWeightedMean(current, 'indeks_spbe_skala_1_sampai_5'),
      tingkat_penerapan_e_budgeting_dan_transparansi_skor: populationWeightedMean(current, 'tingkat_penerapan_e_budgeting_dan_transparansi_skor'),
      persentase_capaian_standar_pelayanan_minimal_spm_persen: populationWeightedMean(current, 'persentase_capaian_standar_pelayanan_minimal_spm_persen'),
    }
    : current.find((row) => row.kode_wilayah === selectedCode);
  const selectedValues = selected ? [
    numberAt(selected, 'indeks_spbe_skala_1_sampai_5') === null ? null : numberAt(selected, 'indeks_spbe_skala_1_sampai_5')! * 20,
    numberAt(selected, 'tingkat_penerapan_e_budgeting_dan_transparansi_skor'),
    numberAt(selected, 'persentase_capaian_standar_pelayanan_minimal_spm_persen'),
  ] : [];
  const radarLabels = ['SPBE (skala visual 0–100)', 'E-budgeting', 'Capaian SPM'];
  const radarRows: ChartTableRow[] = selected ? [
    { wilayah: selectedName, spbe_sumber_skala_1_sampai_5: numberAt(selected, 'indeks_spbe_skala_1_sampai_5'), ebudgeting_skor_sumber: numberAt(selected, 'tingkat_penerapan_e_budgeting_dan_transparansi_skor'), capaian_spm_persen: numberAt(selected, 'persentase_capaian_standar_pelayanan_minimal_spm_persen') },
  ] : [];
  const radarOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    radar: { indicator: radarLabels.map((name) => ({ name, max: 100 })), radius: '65%' },
    series: [{ type: 'radar', data: [{ name: selectedName, value: selectedValues }] }],
  };
  const parallelRows = current.flatMap((row) => {
    const spbe = numberAt(row, 'indeks_spbe_skala_1_sampai_5');
    const ebudgeting = numberAt(row, 'tingkat_penerapan_e_budgeting_dan_transparansi_skor');
    const spm = numberAt(row, 'persentase_capaian_standar_pelayanan_minimal_spm_persen');
    return spbe === null || ebudgeting === null || spm === null ? [] : [{
      wilayah: String(row.nama_daerah),
      kode: String(row.kode_wilayah),
      spbe,
      ebudgeting,
      spm,
    }];
  });
  const parallelOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    parallelAxis: [
      { dim: 0, name: 'Wilayah', type: 'category', data: parallelRows.map((row) => row.wilayah) },
      { dim: 1, name: 'SPBE (1–5)', min: 0, max: 5 },
      { dim: 2, name: 'E-budgeting (skor sumber)', min: 0, max: 100 },
      { dim: 3, name: 'Capaian SPM (%)', min: 0, max: 100 },
    ],
    parallel: { left: 80, right: 35, top: 45, bottom: 35 },
    series: [{
      type: 'parallel',
      lineStyle: { width: 1.5, opacity: 0.25 },
      data: parallelRows.map((row) => [row.wilayah, row.spbe, row.ebudgeting, row.spm]),
    }],
  };
  const parallelTable: ChartTableRow[] = parallelRows.map((row) => ({ wilayah: row.wilayah, kode: row.kode, SPBE: row.spbe, e_budgeting: row.ebudgeting, capaian_SPM: row.spm }));

  if (!current.length) return <StateCard variant="empty" title={`Data pemerintahan ${year} belum tersedia`} description="Sumber tata kelola belum memuat baris untuk tahun terpilih." />;
  return <div className="grid gap-5 lg:grid-cols-2">
    <EChartPanel title="Profil tata kelola daerah" description="Radar wilayah terpilih. SPBE dikalikan 20 hanya untuk penyamaan skala visual; tabel menampilkan nilai sumber dan skalanya berbeda." option={radarOption} rows={radarRows} columns={[{ key: 'wilayah', label: 'Wilayah' }, { key: 'spbe_sumber_skala_1_sampai_5', label: 'SPBE (skala 1–5)' }, { key: 'ebudgeting_skor_sumber', label: 'E-budgeting (skor sumber)' }, { key: 'capaian_spm_persen', label: 'Capaian SPM (%)' }]} />
    <EChartPanel title="Koordinat paralel tata kelola" description={`Perbandingan SPBE, e-budgeting, dan SPM pada skala sumbernya; nilai lengkap pada ${year}.`} option={parallelOption} rows={parallelTable} columns={[{ key: 'wilayah', label: 'Wilayah' }, { key: 'kode', label: 'Kode' }, { key: 'SPBE', label: 'SPBE (1–5)' }, { key: 'e_budgeting', label: 'E-budgeting' }, { key: 'capaian_SPM', label: 'Capaian SPM (%)' }]} height={390} minWidth={560} />
  </div>;
}

function GovernmentSunburst({
  governanceRows,
  apbdRows,
  year,
}: {
  governanceRows: DatasetRow[];
  apbdRows: DatasetRow[];
  year: number;
}) {
  const groups = [
    {
      bidang: 'Tata kelola',
      rows: governanceRows,
      metrics: [
        { key: 'indeks_spbe_skala_1_sampai_5', label: 'Indeks SPBE', unit: 'skala 1–5' },
        { key: 'tingkat_penerapan_e_budgeting_dan_transparansi_skor', label: 'E-budgeting dan transparansi', unit: 'skor sumber' },
        { key: 'persentase_capaian_standar_pelayanan_minimal_spm_persen', label: 'Capaian SPM', unit: '%' },
      ],
    },
    {
      bidang: 'APBD',
      rows: apbdRows,
      metrics: [
        { key: 'realisasi_pad', label: 'Realisasi PAD', unit: 'satuan dataset APBD' },
        { key: 'realisasi_belanja_modal', label: 'Realisasi belanja modal', unit: 'satuan dataset APBD' },
      ],
    },
  ];
  const tableRows: ChartTableRow[] = [];
  const data = groups.map((group) => ({
    name: group.bidang,
    children: group.metrics.map((metric) => {
      const observations = group.rows.filter((row) => row.tahun_anggaran === year && numberAt(row, metric.key) !== null);
      const children = observations.map((row) => {
        const value = numberAt(row, metric.key);
        const wilayah = String(row.nama_daerah ?? row.kode_wilayah ?? '');
        tableRows.push({
          bidang: group.bidang,
          metrik: metric.label,
          wilayah,
          tahun: year,
          nilai: value,
          satuan: metric.unit,
        });
        return { name: value?.toLocaleString('id-ID') ?? 'Data tidak tersedia', value: 1, metricValue: value, unit: metric.unit, metricLabel: metric.label, wilayah };
      });
      return { name: metric.label, children };
    }).filter((metric) => metric.children.length > 0),
  })).filter((group) => group.children.length > 0);
  const option: EChartsOption = {
    tooltip: {
      formatter: (params) => {
        const point = params as { name?: string; data?: { metricValue?: number; unit?: string; metricLabel?: string; wilayah?: string } };
        const detail = point.data?.metricValue === undefined
          ? ''
          : `<br/>${point.data.metricLabel} · ${point.data.wilayah}: ${point.data.metricValue.toLocaleString('id-ID')} ${point.data.unit ?? ''}`;
        return `${point.name ?? ''}${detail}<br/>Luas segmen menunjukkan jumlah observasi, bukan besar nilai lintas satuan.`;
      },
    },
    series: [{
      type: 'sunburst',
      data,
      radius: ['14%', '92%'],
      sort: undefined,
      emphasis: { focus: 'ancestor' },
      itemStyle: { borderWidth: 1, borderColor: '#FDFBF6' },
      label: { rotate: 'radial', minAngle: 8, fontSize: 9 },
      levels: [
        {},
        { r0: '14%', r: '38%', label: { rotate: 'tangential' } },
        { r0: '38%', r: '65%', label: { rotate: 'tangential' } },
        { r0: '65%', r: '92%', label: { rotate: 'radial', fontSize: 8 } },
      ],
    }],
  };
  return <EChartPanel
    title={`Hierarki indikator tata kelola dan APBD · ${year}`}
    description="Sunburst mengelompokkan bidang → metrik → nilai sumber. Luas segmen menghitung observasi; wilayah, angka indikator, dan satuannya ada pada tooltip dan tabel agar skala berbeda tidak dibandingkan sebagai luas."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'bidang', label: 'Bidang' },
      { key: 'metrik', label: 'Metrik' },
      { key: 'wilayah', label: 'Provinsi' },
      { key: 'tahun', label: 'Tahun' },
      { key: 'nilai', label: 'Nilai sumber' },
      { key: 'satuan', label: 'Satuan' },
    ]}
  />;
}

function EconomyCharts({ rows, year }: Omit<Props, 'slug' | 'packages' | 'selectedCode' | 'selectedName'>) {
  const nominalUnit = rows.find((row) => typeof row.satuan_nilai === 'string')?.satuan_nilai ?? 'satuan sumber';
  const yearRows = rows.filter((row) => row.tahun_anggaran === year);
  const years = [...new Set(rows.map((row) => Number(row.tahun_anggaran)).filter(Number.isFinite))].sort((a, b) => a - b);
  const modalTotals = years.map((yearValue) => {
    const values = rows.filter((row) => row.tahun_anggaran === yearValue).map((row) => numberAt(row, 'realisasi_belanja_modal')).filter((value): value is number => value !== null);
    return { year: yearValue, total: values.length ? values.reduce((sum, value) => sum + value, 0) : null, coverage: values.length };
  });
  const waterfallRows: ChartTableRow[] = modalTotals.map((point, index) => ({ tahun: point.year, realisasi_belanja_modal: point.total, perubahan_vs_tahun_sebelumnya: index > 0 && point.total !== null && modalTotals[index - 1].total !== null ? point.total - (modalTotals[index - 1].total as number) : null, jumlah_wilayah_berdata: point.coverage }));
  const bases: (number | null)[] = [];
  const increases: (number | null)[] = [];
  const decreases: (number | null)[] = [];
  modalTotals.forEach((point, index) => {
    const previous = index ? modalTotals[index - 1].total : 0;
    if (point.total === null || previous === null) {
      bases.push(null); increases.push(null); decreases.push(null);
      return;
    }
    const delta = point.total - previous;
    bases.push(index === 0 ? 0 : Math.min(previous, point.total));
    increases.push(delta >= 0 ? delta : null);
    decreases.push(delta < 0 ? -delta : null);
  });
  const waterfallOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Dasar kumulatif', 'Kenaikan', 'Penurunan'] },
    xAxis: { type: 'category', data: years.map(String) },
    yAxis: { type: 'value', name: `Jumlah nominal (${nominalUnit})` },
    series: [
      { name: 'Dasar kumulatif', type: 'bar', stack: 'waterfall', itemStyle: { color: 'transparent', borderColor: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } }, data: bases },
      { name: 'Kenaikan', type: 'bar', stack: 'waterfall', itemStyle: { color: '#0891B2' }, data: increases },
      { name: 'Penurunan', type: 'bar', stack: 'waterfall', itemStyle: { color: '#B45309' }, data: decreases },
    ],
  };

  return <div className="grid gap-5 lg:grid-cols-2">
    <EconomySectorMap rows={yearRows} year={year} />
    <EChartPanel title="Perubahan realisasi belanja modal" description={`Waterfall perubahan tahunan total realisasi provinsi dari APBD dalam ${nominalUnit}. Wilayah tanpa data tidak disamakan dengan nol.`} option={waterfallOption} rows={waterfallRows} columns={[{ key: 'tahun', label: 'Tahun' }, { key: 'realisasi_belanja_modal', label: `Total realisasi (${nominalUnit})` }, { key: 'perubahan_vs_tahun_sebelumnya', label: `Perubahan tahunan (${nominalUnit})` }, { key: 'jumlah_wilayah_berdata', label: 'Wilayah berdata' }]} />
  </div>;
}

const economyMapName = 'igs-economy-sector-provinces';

function sectorPresentation(value: unknown) {
  const sector = typeof value === 'string' ? value : '';
  const normalized = sector.toLocaleLowerCase('id-ID');
  if (normalized.includes('pertanian') || normalized.includes('kehutanan') || normalized.includes('perikanan')) {
    return { key: 'pertanian', icon: '🌿', color: '#387A63', label: 'Pertanian, kehutanan, dan perikanan' };
  }
  if (normalized.includes('tambang') || normalized.includes('penggalian') || normalized.includes('migas')) {
    return { key: 'pertambangan', icon: '⛏', color: '#B45309', label: 'Pertambangan dan penggalian' };
  }
  if (normalized.includes('jasa') || normalized.includes('keuangan') || normalized.includes('perdagangan')) {
    return { key: 'jasa', icon: '▦', color: '#0E4A6F', label: 'Perdagangan dan jasa' };
  }
  return { key: 'lainnya', icon: '•', color: '#6B7280', label: 'Sektor lainnya' };
}

function EconomySectorMap({ rows, year }: { rows: DatasetRow[]; year: number }) {
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provinces = rows.filter((row) => String(row.tingkat_pemerintahan ?? '').toLocaleLowerCase('id-ID').includes('provinsi'));
  const mapRows = provinces.flatMap((row) => {
    const rawSector = row.sektor_ekonomi_pdrb_dominan;
    if (typeof rawSector !== 'string' || !rawSector.trim()) return [];
    return [{
      code: String(row.kode_wilayah),
      name: String(row.nama_daerah),
      sector: rawSector,
      ...sectorPresentation(rawSector),
    }];
  });
  const tableRows: ChartTableRow[] = mapRows.map((row) => ({
    provinsi: row.name,
    sektor_dominan: row.sector,
    kategori: row.label,
    ikon: row.icon,
  }));
  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const point = params as { data?: { name?: string; sector?: string; sectorLabel?: string; icon?: string } };
        const data = point.data;
        const provinceName = mapRows.find((row) => row.code === data?.name)?.name ?? data?.name ?? '';
        return data ? `${provinceName}<br/>${data.icon ?? ''} ${data.sectorLabel ?? ''}<br/>Sektor sumber: ${data.sector ?? 'Data belum tersedia'}` : '';
      },
    },
    series: [{
      type: 'map',
      map: economyMapName,
      nameProperty: 'kode_wilayah',
      roam: true,
      selectedMode: false,
      data: mapRows.map((row) => ({
        name: row.code,
        value: 1,
        sector: row.sector,
        sectorLabel: row.label,
        icon: row.icon,
        itemStyle: { areaColor: row.color },
      })),
      itemStyle: { borderColor: '#FDFBF6', borderWidth: 0.8 },
      emphasis: { itemStyle: { borderColor: '#141414', borderWidth: 1.5 } },
      label: {
        show: true,
        position: 'inside',
        color: '#FDFBF6',
        fontSize: 15,
        formatter: (params) => String((params as { data?: { icon?: string } }).data?.icon ?? ''),
      },
    }],
  };

  useEffect(() => {
    const controller = new AbortController();
    async function boot() {
      try {
        const response = await fetch('/api/gov-geo/provinces', { signal: controller.signal });
        if (!response.ok) throw new Error(`Layanan geometri merespons ${response.status}.`);
        const result = await response.json() as GeoCollection;
        if (result.type !== 'FeatureCollection' || !Array.isArray(result.features)) {
          throw new Error('Berkas batas provinsi memiliki struktur yang tidak valid.');
        }
        if (!echarts.getMap(economyMapName)) echarts.registerMap(economyMapName, result);
        setRegistered(true);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Geometri provinsi tidak dapat dimuat.');
      }
    }
    void boot();
    return () => controller.abort();
  }, []);

  if (!mapRows.length) {
    return <StateCard variant="empty" title={`Data sektor ekonomi ${year} belum tersedia`} description="Sektor PDRB dominan provinsi belum tercatat untuk tahun terpilih." />;
  }
  if (error) {
    return <div className="space-y-3">
      <StateCard variant="error" title="Peta sektor tidak dapat dimuat" description={error} />
      <SurfaceCard>
        <h2 className="font-sans text-h3 text-ink-900">Sektor ekonomi provinsi · {year}</h2>
        <p className="mt-1 text-caption text-ink-500">Fallback tabel menunjukkan sektor PDRB dominan; ikon mengelompokkan sektor dan bukan nilai kontribusi.</p>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full min-w-max text-left text-xs">
            <thead><tr className="border-b border-paper-300">{['provinsi', 'sektor_dominan', 'kategori'].map((key) => <th key={key} className="whitespace-nowrap py-2 pr-4 font-semibold">{getIgsLabel(key)}</th>)}</tr></thead>
            <tbody>{tableRows.map((row) => <tr key={String(row.provinsi)} className="border-b border-paper-200">{['provinsi', 'sektor_dominan', 'kategori'].map((key) => <td key={key} className="whitespace-nowrap py-1.5 pr-4 font-mono">{String(row[key])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>;
  }
  if (!registered) return <StateCard variant="loading" title="Memuat peta sektor" description="Mendaftarkan geometri provinsi untuk memetakan sektor dominan." />;

  return <div>
    <div className="mb-3 flex flex-wrap gap-3 text-xs text-ink-700" aria-label="Legenda sektor ekonomi">
      {[
        { icon: '🌿', label: 'Pertanian', color: '#387A63' },
        { icon: '⛏', label: 'Pertambangan', color: '#B45309' },
        { icon: '▦', label: 'Perdagangan/jasa', color: '#0E4A6F' },
      ].map((item) => <span key={item.label} className="inline-flex items-center gap-1.5 border border-paper-300 bg-paper-50 px-2 py-1"><span aria-hidden="true" style={{ color: item.color }}>{item.icon}</span>{item.label}</span>)}
    </div>
    <EChartPanel
      title={`Peta sektor ekonomi provinsi · ${year}`}
      description="Ikon dan warna menunjukkan sektor PDRB dominan pada tiap provinsi, bukan besar kontribusinya. Lihat tabel untuk kategori dan sektor sumber."
      option={option}
      rows={tableRows}
      columns={[{ key: 'provinsi', label: 'Provinsi' }, { key: 'sektor_dominan', label: 'Sektor dominan (kategori sumber)' }, { key: 'kategori', label: 'Kategori ikon' }]}
      height={520}
      minWidth={500}
    />
  </div>;
}

function EducationCharts({ rows, serviceRows = [], year }: Omit<Props, 'slug' | 'packages' | 'selectedCode' | 'selectedName'>) {
  const yearLabels = [...new Set(rows.map((row) => Number(row.tahun_anggaran)).filter(Number.isFinite))].sort((a, b) => a - b);
  const regionLabels = [...new Map(rows.map((row) => [String(row.kode_wilayah), String(row.nama_daerah)])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'id')).map(([, name]) => name);
  const regionIndex = new Map(regionLabels.map((name, index) => [name, index]));
  const yearIndex = new Map(yearLabels.map((value, index) => [value, index]));
  const heatRows: ChartTableRow[] = rows.flatMap((row) => {
    const value = numberAt(row, 'persentase_kondisi_gedung_sekolah_layak_persen');
    return value === null ? [] : [{ wilayah: String(row.nama_daerah), tahun: Number(row.tahun_anggaran), gedung_layak_persen: value }];
  });
  const heatOption: EChartsOption = {
    tooltip: { position: 'top', formatter: (params) => {
      const point = params as { data?: [number, number, number] };
      const [x, y, value] = point.data ?? [0, 0, 0];
      return `${regionLabels[y]} · ${yearLabels[x]}<br/>Gedung layak: ${value}%`;
    } },
    grid: { left: 100, right: 25, top: 25, bottom: 70 },
    xAxis: { type: 'category', data: yearLabels.map(String), splitArea: { show: true } },
    yAxis: { type: 'category', data: regionLabels, axisLabel: { fontSize: 8 }, splitArea: { show: true } },
    visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', bottom: 10, inRange: { color: ['#F2EDE3', '#0891B2', '#0E4A6F'] } },
    series: [{
      type: 'heatmap',
      data: heatRows.map((row) => [yearIndex.get(Number(row.tahun)) ?? 0, regionIndex.get(String(row.wilayah)) ?? 0, Number(row.gedung_layak_persen)]),
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.25)' } },
    }],
  };
  const current = rows.filter((row) => row.tahun_anggaran === year && numberAt(row, 'persentase_kondisi_gedung_sekolah_layak_persen') !== null);
  const islands = [...new Set(current.map((row) => String(row.pulau_kawasan ?? 'Tidak diklasifikasikan')))].sort((a, b) => a.localeCompare(b, 'id'));
  const xValues = Array.from({ length: 41 }, (_, index) => index * 2.5);
  const ridgeSeries = islands.map((island, index) => {
    const values = current.filter((row) => String(row.pulau_kawasan ?? 'Tidak diklasifikasikan') === island).map((row) => numberAt(row, 'persentase_kondisi_gedung_sekolah_layak_persen')).filter((value): value is number => value !== null);
    const bandwidth = 8;
    const densities = xValues.map((x) => values.reduce((sum, value) => sum + Math.exp(-0.5 * ((x - value) / bandwidth) ** 2), 0) / (values.length || 1));
    const maxDensity = Math.max(...densities, 0);
    const points = xValues.map((x, pointIndex) => [x, index * 1.25 + (maxDensity ? densities[pointIndex] / maxDensity : 0)]);
    return { name: island, type: 'line' as const, smooth: true, showSymbol: false, areaStyle: { opacity: 0.18 }, lineStyle: { width: 2 }, data: points };
  });
  const ridgeOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0 },
    grid: { left: 45, right: 20, top: 25, bottom: 60 },
    xAxis: { type: 'value', min: 0, max: 100, name: 'Gedung sekolah layak (%)' },
    yAxis: { type: 'value', min: 0, max: Math.max(1, islands.length * 1.25), axisLabel: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
    series: ridgeSeries,
  };
  const ratioRows = serviceRows.filter((row) => row.tahun_anggaran === year && numberAt(row, 'rata_rata_rasio_guru_terhadap_murid') !== null);
  const violinIslands = [...new Set(ratioRows.map((row) => String(row.pulau_kawasan ?? 'Tidak diklasifikasikan')))].sort((a, b) => a.localeCompare(b, 'id'));
  const ratios = ratioRows.map((row) => numberAt(row, 'rata_rata_rasio_guru_terhadap_murid')).filter((value): value is number => value !== null);
  const ratioMin = Math.min(...ratios);
  const ratioMax = Math.max(...ratios);
  const domainMin = ratios.length ? ratioMin - (ratioMin === ratioMax ? 1 : 0.5) : 0;
  const domainMax = ratios.length ? ratioMax + (ratioMin === ratioMax ? 1 : 0.5) : 1;
  const ratioSamples = Array.from({ length: 41 }, (_, index) => domainMin + ((domainMax - domainMin) * index / 40));
  const densityGroups = violinIslands.map((island) => {
    const values = ratioRows.filter((row) => String(row.pulau_kawasan ?? 'Tidak diklasifikasikan') === island)
      .map((row) => numberAt(row, 'rata_rata_rasio_guru_terhadap_murid'))
      .filter((value): value is number => value !== null);
    const bandwidth = Math.max((domainMax - domainMin) / 10, 0.2);
    const points = ratioSamples.map((value) => ({
      value,
      density: values.reduce((sum, sample) => sum + Math.exp(-0.5 * ((value - sample) / bandwidth) ** 2), 0) / (values.length || 1),
    }));
    return { points, maxDensity: Math.max(...points.map((point) => point.density), 0) };
  });
  const violinColors = ['#0E4A6F', '#0891B2', '#C69C4B', '#6B7280', '#387A63', '#875B87'];
  const violinOption: EChartsOption = {
    tooltip: { trigger: 'item', formatter: (params) => String((params as { name?: string }).name ?? '') },
    grid: { left: 65, right: 25, top: 25, bottom: 60 },
    xAxis: { type: 'category', data: violinIslands, name: 'Pulau/kawasan', nameLocation: 'middle', nameGap: 35, axisLabel: { rotate: 20 } },
    yAxis: { type: 'value', min: domainMin, max: domainMax, name: 'Rasio guru : murid' },
    series: [{
      type: 'custom',
      name: 'Kepadatan rasio',
      coordinateSystem: 'cartesian2d',
      renderItem: (_params, api) => {
        const index = Number(api.value(0));
        const group = densityGroups[index];
        if (!group || group.maxDensity <= 0) return null;
        const midValue = (domainMin + domainMax) / 2;
        const centerX = api.coord([index, midValue])[0];
        const neighborIndex = index < violinIslands.length - 1 ? index + 1 : index - 1;
        const bandWidth = violinIslands.length > 1
          ? Math.abs(api.coord([neighborIndex, midValue])[0] - centerX)
          : 100;
        const leftPoints = group.points.map((point) => {
          const center = api.coord([index, point.value]);
          return [center[0] - bandWidth * 0.36 * (point.density / group.maxDensity), center[1]];
        });
        const rightPoints = [...group.points].reverse().map((point) => {
          const center = api.coord([index, point.value]);
          return [center[0] + bandWidth * 0.36 * (point.density / group.maxDensity), center[1]];
        });
        return {
          type: 'polygon',
          shape: { points: [...leftPoints, ...rightPoints] },
          style: api.style({ fill: violinColors[index % violinColors.length], opacity: 0.46, stroke: violinColors[index % violinColors.length] }),
        };
      },
      encode: { x: 0 },
      data: violinIslands.map((island, index) => ({ name: island, value: [index] })),
    }],
  };
  const violinTable: ChartTableRow[] = ratioRows.map((row) => ({
    pulau: String(row.pulau_kawasan ?? ''),
    provinsi: String(row.nama_daerah ?? row.kode_wilayah ?? ''),
    rasio_guru_murid: numberAt(row, 'rata_rata_rasio_guru_terhadap_murid'),
  }));
  return <div className="grid gap-5 lg:grid-cols-2">
    <EChartPanel title="Heatmap kondisi gedung × tahun" description="Persentase kondisi gedung sekolah layak per provinsi dan tahun; warna bukan pengganti nilai pada tabel." option={heatOption} rows={heatRows} columns={[{ key: 'wilayah', label: 'Provinsi' }, { key: 'tahun', label: 'Tahun' }, { key: 'gedung_layak_persen', label: 'Gedung layak (%)' }]} height={580} />
    <EChartPanel title={`Ridgeline kondisi gedung per pulau · ${year}`} description="Kurva distribusi dihitung dari persentase provinsi yang tersedia. Tinggi kurva dinormalisasi per pulau untuk membandingkan bentuk, bukan jumlah." option={ridgeOption} rows={current.map((row) => ({ pulau: String(row.pulau_kawasan), provinsi: String(row.nama_daerah), gedung_layak_persen: numberAt(row, 'persentase_kondisi_gedung_sekolah_layak_persen') }))} columns={[{ key: 'pulau', label: 'Pulau/kawasan' }, { key: 'provinsi', label: 'Provinsi' }, { key: 'gedung_layak_persen', label: 'Gedung layak (%)' }]} />
    <EChartPanel title={`Distribusi rasio guru–murid per pulau · ${year}`} description="Bentuk violin adalah estimasi kepadatan yang dinormalisasi pada setiap pulau/kawasan; tabel menampilkan rasio sumber per provinsi." option={violinOption} rows={violinTable} columns={[{ key: 'pulau', label: 'Pulau/kawasan' }, { key: 'provinsi', label: 'Provinsi' }, { key: 'rasio_guru_murid', label: 'Rasio guru : murid' }]} />
  </div>;
}

function SocialBoxplot({ rows, year }: Omit<Props, 'slug' | 'packages' | 'selectedCode' | 'selectedName'>) {
  const current = rows.filter((row) => row.tahun_anggaran === year);
  const values = current.flatMap((row) => {
    const ipm = numberAt(row, 'indeks_pembangunan_manusia_ipm');
    return ipm === null ? [] : [{ provinsi: String(row.nama_daerah), IPM: ipm }];
  });
  if (!values.length) return <StateCard variant="empty" title={`Data IPM ${year} belum tersedia`} description="Histogram membutuhkan nilai IPM provinsi yang tercatat pada tahun terpilih." />;
  const minimum = Math.min(...values.map((row) => row.IPM));
  const maximum = Math.max(...values.map((row) => row.IPM));
  const binCount = 10;
  const binWidth = maximum === minimum ? 1 : (maximum - minimum) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = minimum + index * binWidth;
    const end = index === binCount - 1 ? maximum : start + binWidth;
    const count = values.filter((row) => row.IPM >= start && (index === binCount - 1 ? row.IPM <= end : row.IPM < end)).length;
    return { label: `${formatDecimal(start, 2)}–${formatDecimal(end, 2)}`, count };
  });
  const option: EChartsOption = {
    tooltip: { trigger: 'axis', formatter: (params) => {
      const point = Array.isArray(params) ? params[0] as { name?: string; value?: number } : params as { name?: string; value?: number };
      return `${point.name ?? ''} poin<br/>Jumlah provinsi: ${point.value ?? 0}`;
    } },
    grid: { left: 65, right: 25, top: 30, bottom: 65 },
    xAxis: { type: 'category', data: bins.map((bin) => bin.label), name: 'Rentang IPM (poin)', nameLocation: 'middle', nameGap: 42, axisLabel: { rotate: 25, fontSize: 9 } },
    yAxis: { type: 'value', name: 'Jumlah provinsi', minInterval: 1 },
    series: [{ type: 'bar', data: bins.map((bin) => bin.count), barMaxWidth: 34, itemStyle: { color: '#0E4A6F' } }],
  };
  const histogramRows: ChartTableRow[] = bins.map((bin) => ({ rentang_IPM_poin: bin.label, jumlah_provinsi: bin.count }));
  const provinceRows: ChartTableRow[] = values.map((row) => ({ provinsi: row.provinsi, IPM: row.IPM }));
  return <div className="space-y-3">
    <EChartPanel title={`Histogram IPM provinsi · ${year}`} description={`Distribusi IPM per rentang ${formatDecimal(binWidth, 2)} poin; sumbu vertikal menunjukkan jumlah provinsi. Tabel menampilkan jumlah pada setiap bin.`} option={option} rows={histogramRows} columns={[{ key: 'rentang_IPM_poin', label: 'Rentang IPM (poin)' }, { key: 'jumlah_provinsi', label: 'Jumlah provinsi' }]} />
    <details className="border border-paper-300 bg-paper-50 p-4">
      <summary className="cursor-pointer font-mono text-[11px] text-ink-500">Lihat nilai IPM provinsi yang membentuk histogram ({provinceRows.length})</summary>
      <p className="mt-2 text-xs text-ink-500">Nilai pada tabel menggunakan poin IPM; provinsi tanpa nilai tidak masuk ke dalam distribusi.</p>
      <div className="mt-2 max-h-64 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-paper-300"><th className="py-2 pr-4">Provinsi</th><th className="py-2">IPM (poin)</th></tr></thead>
          <tbody>{provinceRows.map((row) => <tr key={String(row.provinsi)} className="border-b border-paper-200"><td className="py-1.5 pr-4">{String(row.provinsi)}</td><td className="py-1.5 font-mono">{typeof row.IPM === 'number' ? formatDecimal(row.IPM, 4) : 'Data belum tersedia'}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </div>;
}

function SocialVenn({ rows, year }: Omit<Props, 'slug' | 'packages' | 'selectedCode' | 'selectedName'>) {
  const id = useId().replaceAll(':', '');
  const current = rows.filter((row) => row.tahun_anggaran === year);
  const ipmMedian = median(current.map((row) => numberAt(row, 'indeks_pembangunan_manusia_ipm')).filter((value): value is number => value !== null));
  const povertyMedian = median(current.map((row) => numberAt(row, 'persentase_penduduk_miskin_persen')).filter((value): value is number => value !== null));
  const welfareMedian = median(current.map((row) => numberAt(row, '_derived_welfare_composite')).filter((value): value is number => value !== null));
  const complete = current.flatMap((row) => {
    const ipm = numberAt(row, 'indeks_pembangunan_manusia_ipm');
    const poverty = numberAt(row, 'persentase_penduduk_miskin_persen');
    const welfare = numberAt(row, '_derived_welfare_composite');
    return ipm === null || poverty === null || welfare === null || ipmMedian === null || povertyMedian === null || welfareMedian === null ? [] : [{
      wilayah: String(row.nama_daerah),
      IPM: ipm,
      kemiskinan_persen: poverty,
      indeks_kesejahteraan: welfare,
      IPM_di_atas_median: ipm >= ipmMedian,
      kemiskinan_di_bawah_median: poverty <= povertyMedian,
      kesejahteraan_di_atas_median: welfare >= welfareMedian,
    }];
  });
  const regionCount = new Map<string, number>();
  complete.forEach((row) => {
    const combo = `${row.IPM_di_atas_median ? '1' : '0'}${row.kemiskinan_di_bawah_median ? '1' : '0'}${row.kesejahteraan_di_atas_median ? '1' : '0'}`;
    regionCount.set(combo, (regionCount.get(combo) ?? 0) + 1);
  });
  const vennTitleId = `${id}-title`;
  const vennDescId = `${id}-desc`;
  const vennRows: ChartTableRow[] = complete.map((row) => ({ wilayah: row.wilayah, IPM: row.IPM, kemiskinan_persen: row.kemiskinan_persen, indeks_kesejahteraan: row.indeks_kesejahteraan, IPM_di_atas_median: row.IPM_di_atas_median ? 'Ya' : 'Tidak', kemiskinan_di_bawah_median: row.kemiskinan_di_bawah_median ? 'Ya' : 'Tidak', kesejahteraan_di_atas_median: row.kesejahteraan_di_atas_median ? 'Ya' : 'Tidak' }));
  const cells = [
    { key: '100', x: 100, y: 112, label: 'IPM saja' },
    { key: '010', x: 270, y: 112, label: 'Kemiskinan saja' },
    { key: '001', x: 185, y: 270, label: 'Kesejahteraan saja' },
    { key: '110', x: 185, y: 87, label: 'IPM + kemiskinan' },
    { key: '101', x: 130, y: 205, label: 'IPM + kesejahteraan' },
    { key: '011', x: 240, y: 205, label: 'Kemiskinan + kesejahteraan' },
    { key: '111', x: 185, y: 160, label: 'Ketiganya' },
    { key: '000', x: 355, y: 265, label: 'Tidak termasuk' },
  ];

  return <SurfaceCard>
    <h2 id={vennTitleId} className="font-sans text-h3 text-ink-900">Irisan IPM, kemiskinan, dan kesejahteraan</h2>
    <p id={vennDescId} className="mt-1 text-caption text-ink-500">Lingkaran menunjukkan keanggotaan berdasarkan median provinsi pada {year}; posisi hitungan hanya penanda irisan, bukan luas proporsional.</p>
    <svg role="group" aria-labelledby={`${vennTitleId} ${vennDescId}`} aria-label={`Diagram Venn indikator sosial untuk ${year}`} viewBox="0 0 440 340" className="mt-4 h-auto w-full">
      <title>Irisan indikator sosial per provinsi</title>
      <desc>Diagram tiga himpunan dengan jumlah wilayah pada setiap kombinasi ambang median. Nilai median tidak tersedia bila datanya kosong.</desc>
      <circle cx="145" cy="145" r="105" fill="#0E4A6F" fillOpacity=".22" stroke="#0E4A6F" strokeWidth="2" />
      <circle cx="235" cy="145" r="105" fill="#0891B2" fillOpacity=".2" stroke="#0891B2" strokeWidth="2" />
      <circle cx="190" cy="215" r="105" fill="#B45309" fillOpacity=".18" stroke="#B45309" strokeWidth="2" />
      {cells.map((cell) => {
        const count = regionCount.get(cell.key) ?? 0;
        return <g key={cell.key} tabIndex={0} role="group" aria-label={`${cell.label}: ${count} provinsi`} className="group cursor-help outline-none">
          <title>{cell.label}: {count} provinsi</title>
          <text x={cell.x} y={cell.y - 7} textAnchor="middle" fill="#141414" fontSize="10" fontWeight="600" className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">{cell.label}</text>
          <text x={cell.x} y={cell.y + 6} textAnchor="middle" fill="#141414" fontSize="12" fontWeight="600">{count}</text>
        </g>;
      })}
      <g tabIndex={0} role="group" aria-label={`IPM minimal median ${ipmMedian === null ? 'tidak tersedia' : formatDecimal(ipmMedian, 2)} poin`} className="group outline-none">
        <title>Lingkaran IPM · minimal {ipmMedian === null ? 'tidak tersedia' : `${formatDecimal(ipmMedian, 2)} poin`}</title>
        <text x="75" y="45" fill="#0E4A6F" fontSize="11" className="opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">IPM ≥ {ipmMedian === null ? '—' : formatDecimal(ipmMedian, 2)} poin</text>
      </g>
      <g tabIndex={0} role="group" aria-label={`Kemiskinan maksimal median ${povertyMedian === null ? 'tidak tersedia' : `${formatDecimal(povertyMedian, 2)} persen`} `} className="group outline-none">
        <title>Lingkaran kemiskinan · maksimal {povertyMedian === null ? 'tidak tersedia' : `${formatDecimal(povertyMedian, 2)} persen`}</title>
        <text x="250" y="45" fill="#087E98" fontSize="11" className="opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">Kemiskinan ≤ {povertyMedian === null ? '—' : `${formatDecimal(povertyMedian, 2)}%`}</text>
      </g>
      <g tabIndex={0} role="group" aria-label={`Kesejahteraan minimal median ${welfareMedian === null ? 'tidak tersedia' : formatDecimal(welfareMedian, 2)}`} className="group outline-none">
        <title>Lingkaran kesejahteraan · minimal {welfareMedian === null ? 'tidak tersedia' : formatDecimal(welfareMedian, 2)}</title>
        <text x="150" y="330" fill="#9A4A08" fontSize="11" className="opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">Kesejahteraan ≥ {welfareMedian === null ? '—' : formatDecimal(welfareMedian, 2)}</text>
      </g>
    </svg>
    <details className="mt-3 border-t border-paper-200 pt-3">
      <summary className="cursor-pointer font-mono text-[11px] text-ink-500">Lihat nilai dan keanggotaan sebagai tabel ({vennRows.length} provinsi)</summary>
      <div className="mt-3 max-h-64 overflow-auto"><table className="min-w-max text-left text-xs"><thead><tr>{Object.keys(vennRows[0] ?? { wilayah: '', IPM: '', kemiskinan_persen: '', indeks_kesejahteraan: '', IPM_di_atas_median: '', kemiskinan_di_bawah_median: '', kesejahteraan_di_atas_median: '' }).map((key) => <th key={key} className="whitespace-nowrap border-b border-paper-300 p-2">{getIgsLabel(key)}</th>)}</tr></thead><tbody>{vennRows.map((row) => <tr key={String(row.wilayah)}>{Object.entries(row).map(([key, value]) => <td key={key} className="whitespace-nowrap border-b border-paper-200 p-2 font-mono">{String(value)}</td>)}</tr>)}</tbody></table></div>
      <p className="mt-2 text-xs text-ink-500">Tabel ini menunjukkan nilai dan posisi setiap wilayah terhadap median indikator; nilainya membantu membaca pola, bukan menetapkan sebab-akibat.</p>
    </details>
  </SurfaceCard>;
}

function SocialCharts({ rows, year }: Omit<Props, 'slug' | 'packages' | 'selectedCode' | 'selectedName'>) {
  return <div className="grid gap-5 lg:grid-cols-2"><SocialBoxplot rows={rows} year={year} /><SocialVenn rows={rows} year={year} /></div>;
}

function DistrictCharts({ packages, year }: Omit<Props, 'slug' | 'rows' | 'selectedCode' | 'selectedName'>) {
  const current = packages.filter((row) => row.tahun_anggaran === year);
  const eligible = current.filter((row) => ['nilai_pagu_juta_rp', 'nilai_hps_juta_rp', 'nilai_kontrak_juta_rp'].every((key) => numberAt(row, key) !== null));
  const paguRows = current.filter((row) => numberAt(row, 'nilai_pagu_juta_rp') !== null);
  const hpsRows = current.filter((row) => numberAt(row, 'nilai_pagu_juta_rp') !== null && numberAt(row, 'nilai_hps_juta_rp') !== null);
  const sumField = (key: string) => eligible.reduce((sum, row) => sum + (numberAt(row, key) ?? 0), 0);
  const totals = [
    { source: 'Pagu', target: 'Tender (HPS tersedia)', value: hpsRows.length },
    { source: 'Tender (HPS tersedia)', target: 'Kontrak', value: eligible.length },
  ];
  const sankeyOption: EChartsOption = {
    tooltip: { trigger: 'item', formatter: (params) => {
      const link = params as { data?: { source?: string; target?: string; value?: number } };
      const data = link.data;
      return data?.source && data.target ? `${data.source} → ${data.target}: ${data.value?.toLocaleString('id-ID')} paket` : String((params as { name?: string }).name ?? '');
    } },
    series: [{
      type: 'sankey',
      data: [{ name: 'Pagu' }, { name: 'Tender (HPS tersedia)' }, { name: 'Kontrak' }],
      links: totals,
      emphasis: { focus: 'adjacency' },
      lineStyle: { color: 'gradient', curveness: 0.5 },
      label: { color: '#141414' },
    }],
  };
  const sankeyRows: ChartTableRow[] = [
    { tahapan: 'Pagu tercatat', jumlah_paket: paguRows.length, nominal_juta_rp_paket_lengkap: sumField('nilai_pagu_juta_rp') },
    { tahapan: 'HPS tersedia', jumlah_paket: hpsRows.length, nominal_juta_rp_paket_lengkap: sumField('nilai_hps_juta_rp') },
    { tahapan: 'Kontrak tercatat', jumlah_paket: eligible.length, nominal_juta_rp_paket_lengkap: sumField('nilai_kontrak_juta_rp') },
  ];
  const regionTotals = new Map<string, number>();
  const sectorTotals = new Map<string, number>();
  current.forEach((row) => {
    const region = typeof row.nama_daerah === 'string' ? row.nama_daerah : '';
    const sector = typeof row.sektor_infrastruktur === 'string' ? row.sektor_infrastruktur : '';
    if (region) regionTotals.set(region, (regionTotals.get(region) ?? 0) + 1);
    if (sector) sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + 1);
  });
  const topRegions = new Set([...regionTotals].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([region]) => region));
  const topSectors = new Set([...sectorTotals].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([sector]) => sector));
  const linksByPair = new Map<string, number>();
  current.forEach((row) => {
    const region = typeof row.nama_daerah === 'string' ? row.nama_daerah : '';
    const sector = typeof row.sektor_infrastruktur === 'string' ? row.sektor_infrastruktur : '';
    if (region && sector && topRegions.has(region) && topSectors.has(sector)) {
      const key = `${region}\u0000${sector}`;
      linksByPair.set(key, (linksByPair.get(key) ?? 0) + 1);
    }
  });
  const edges = [...linksByPair].map(([key, value]) => {
    const [region, sector] = key.split('\u0000');
    return { source: region, target: sector, value };
  });
  const nodes = [
    ...[...topRegions].map((name) => ({ name, category: 0, symbolSize: Math.min(42, 12 + (regionTotals.get(name) ?? 0)) })),
    ...[...topSectors].map((name) => ({ name, category: 1, symbolSize: Math.min(36, 12 + (sectorTotals.get(name) ?? 0)) })),
  ];
  const networkOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: [{ data: ['Wilayah', 'Sektor infrastruktur'] }],
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links: edges,
      categories: [{ name: 'Wilayah' }, { name: 'Sektor infrastruktur' }],
      roam: true,
      label: { show: true, fontSize: 9 },
      force: { repulsion: 150, edgeLength: 85 },
      lineStyle: { width: 1, opacity: 0.5, curveness: 0.15 },
      emphasis: { focus: 'adjacency' },
    }],
  };
  const networkRows: ChartTableRow[] = edges.map((edge) => ({ wilayah: edge.source, sektor_infrastruktur: edge.target, jumlah_paket: edge.value }));
  const provincialPackages = current.filter((row) => row.tingkat_pemerintahan === 'Provinsi' && typeof row.nama_pemenang_rekanan === 'string' && row.nama_pemenang_rekanan.trim() !== '' && row.nama_pemenang_rekanan !== '-');
  const contractorTotals = new Map<string, number>();
  provincialPackages.forEach((row) => {
    const contractor = String(row.nama_pemenang_rekanan);
    contractorTotals.set(contractor, (contractorTotals.get(contractor) ?? 0) + 1);
  });
  const topContractors = new Set([...contractorTotals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id')).slice(0, 10).map(([name]) => name));
  const pairTotals = new Map<string, number>();
  provincialPackages.forEach((row) => {
    const province = typeof row.provinsi === 'string' ? row.provinsi : '';
    const contractor = String(row.nama_pemenang_rekanan);
    if (!province || !topContractors.has(contractor)) return;
    const key = `${province}\u0000${contractor}`;
    pairTotals.set(key, (pairTotals.get(key) ?? 0) + 1);
  });
  const chordLinks = [...pairTotals].map(([key, value]) => {
    const [province, contractor] = key.split('\u0000');
    return { source: province, target: contractor, value };
  });
  const chordProvinces = [...new Set(chordLinks.map((link) => link.source))];
  const chordContractors = [...new Set(chordLinks.map((link) => link.target))];
  const chordNodes = [
    ...chordProvinces.map((name) => ({ name, category: 0, symbolSize: 10 })),
    ...chordContractors.map((name) => ({ name, category: 1, symbolSize: 14 })),
  ];
  const chordOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: [{ data: ['Provinsi', 'Rekanan'] }],
    series: [{
      type: 'graph',
      layout: 'circular',
      circular: { rotateLabel: true },
      data: chordNodes,
      links: chordLinks,
      categories: [{ name: 'Provinsi' }, { name: 'Rekanan' }],
      roam: true,
      label: { show: true, fontSize: 8 },
      lineStyle: { width: 1.5, opacity: 0.48, curveness: 0.12 },
      emphasis: { focus: 'adjacency' },
    }],
  };
  const chordRows: ChartTableRow[] = chordLinks.map((link) => ({
    provinsi: link.source,
    rekanan: link.target,
    jumlah_paket: link.value,
  }));
  return <div className="grid gap-5 lg:grid-cols-2">
    <EChartPanel title={`Rantai tahapan pengadaan · ${year}`} description={`Sankey menghitung paket dengan pagu, HPS, lalu kontrak tercatat. HPS digunakan sebagai penanda tahap tender karena sumber tidak menyediakan nilai tender terpisah. Tabel menampilkan total nominal pada subset paket yang memiliki ketiga nilai.`} option={sankeyOption} rows={sankeyRows} columns={[{ key: 'tahapan', label: 'Tahapan' }, { key: 'jumlah_paket', label: 'Jumlah paket' }, { key: 'nominal_juta_rp_paket_lengkap', label: 'Nominal (juta Rp), paket lengkap' }]} />
    <EChartPanel title={`Jejaring wilayah × sektor pengadaan · ${year}`} description="Sisi menghubungkan sepuluh wilayah dan sektor dengan jumlah paket tertinggi; bobot sisi adalah jumlah paket pada sumber PBJ." option={networkOption} rows={networkRows} columns={[{ key: 'wilayah', label: 'Wilayah' }, { key: 'sektor_infrastruktur', label: 'Sektor infrastruktur' }, { key: 'jumlah_paket', label: 'Jumlah paket' }]} height={390} />
    <EChartPanel title={`Relasi provinsi × 10 rekanan teratas · ${year}`} description="Graf berlayout melingkar menghubungkan provinsi dengan rekanan dari jumlah paket PBJ tahun terpilih; sisi berbobot menurut jumlah paket." option={chordOption} rows={chordRows} columns={[{ key: 'provinsi', label: 'Provinsi' }, { key: 'rekanan', label: 'Rekanan' }, { key: 'jumlah_paket', label: 'Jumlah paket' }]} height={390} />
  </div>;
}

export function GovTopicInventory(props: Props) {
  switch (props.slug) {
    case 'pemerintahan':
      return <div className="space-y-5">
        <GoverningCharts rows={props.rows} year={props.year} selectedCode={props.selectedCode} selectedName={props.selectedName} />
        <GovernmentSunburst governanceRows={props.governanceRows ?? []} apbdRows={props.apbdRows ?? []} year={props.year} />
      </div>;
    case 'ekonomi':
      return <EconomyCharts rows={props.rows} year={props.year} />;
    case 'pendidikan':
      return <EducationCharts rows={props.rows} serviceRows={props.serviceRows} year={props.year} />;
    case 'sosial-publik':
      return <SocialCharts rows={props.rows} year={props.year} />;
    case 'daerah':
      return <DistrictCharts packages={props.packages} year={props.year} />;
    default:
      return <StateCard variant="empty" title="Visualisasi belum tersedia" description="Halaman ini belum memiliki spesifikasi chart." />;
  }
}
