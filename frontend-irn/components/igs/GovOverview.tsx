'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { GovPageHeader } from './GovPageHeader';
import { MetricChart } from './MetricChart';
import { MetricTile } from './MetricTile';
import { IgsYearSelector, useGovYear } from './GovYearProvider';
import { getMetricValue, formatValue } from '@/lib/data/format';
import type { DatasetRow, MetricDefinition, Region } from '@/lib/data/schemas';
import { GovSearch } from './GovSearch';
import igsSite from '@/content/igs/site.json';
import bidang from '@/content/igs/bidang.json';
import { StateCard } from '@/components/ui/StateCard';
import { getIgsLabel } from '@/lib/igs-labels';
import { populationWeightedMean } from '@/lib/gov/aggregation';
import { RegionHierarchySelector } from './RegionHierarchySelector';
import { filterRowsByRegionSelection, getRegionSelectionName, NATIONAL_REGION_SELECTION, type RegionSelection } from '@/lib/gov/region-selection';

type PreviewDatum = { label: string; value: number | null };
type MiniChartKind = 'line' | 'bar' | 'donut';

export type GovInsightTeaser = {
  id: string;
  title: string;
  metricALabel: string;
  metricBLabel: string;
  year: number;
  rows: { a: number; b: number }[];
  href?: string;
};

const topicVisuals: Record<string, {
  accent: string;
  image: string;
  imageAlt: string;
  credit: string;
  creditHref: string;
}> = {
  pemerintahan: {
    accent: '#0E4A6F',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80',
    imageAlt: 'Gedung-gedung perkotaan sebagai ilustrasi tata kelola pemerintahan',
    credit: 'Unsplash',
    creditHref: 'https://unsplash.com/',
  },
  ekonomi: {
    accent: '#065F46',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80',
    imageAlt: 'Layar berisi grafik dan data ekonomi',
    credit: 'Unsplash',
    creditHref: 'https://unsplash.com/',
  },
  pendidikan: {
    accent: '#1E40AF',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80',
    imageAlt: 'Ruang kelas dengan guru dan para siswa',
    credit: 'Unsplash',
    creditHref: 'https://unsplash.com/',
  },
  'sosial-publik': {
    accent: '#B45309',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=900&q=80',
    imageAlt: 'Sekelompok orang berkumpul dalam kegiatan komunitas',
    credit: 'Unsplash',
    creditHref: 'https://unsplash.com/',
  },
  daerah: {
    accent: '#6B21A8',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Bali%2C_Rice_fields%2C_Rice_terraces_in_East_Bali%2C_Indonesia.jpg/1280px-Bali%2C_Rice_fields%2C_Rice_terraces_in_East_Bali%2C_Indonesia.jpg',
    imageAlt: 'Sawah terasering di Bali Timur',
    credit: 'Vyacheslav Argenberg · CC BY 4.0 / Wikimedia Commons',
    creditHref: 'https://commons.wikimedia.org/wiki/File:Bali,_Rice_fields,_Rice_terraces_in_East_Bali,_Indonesia.jpg',
  },
  infrastruktur: {
    accent: '#0891B2',
    image: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=900&q=80',
    imageAlt: 'Pembangunan jalan layang sebagai ilustrasi infrastruktur',
    credit: 'Unsplash',
    creditHref: 'https://unsplash.com/',
  },
  lingkungan: {
    accent: '#387A63',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80',
    imageAlt: 'Kanopi hutan tropis sebagai ilustrasi lingkungan',
    credit: 'Unsplash',
    creditHref: 'https://unsplash.com/',
  },
  pangan: {
    accent: '#C69C4B',
    image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=900&q=80',
    imageAlt: 'Petani memegang gabah sebagai ilustrasi produksi pangan',
    credit: 'Unsplash',
    creditHref: 'https://unsplash.com/',
  },
};

function MiniPreviewChart({
  title,
  description,
  data,
  kind,
  unit,
}: {
  title: string;
  description: string;
  data: PreviewDatum[];
  kind: MiniChartKind;
  unit: string;
}) {
  const values = data.map((item) => item.value).filter((value): value is number => value !== null && Number.isFinite(value));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const linePoints = data.flatMap((item, index) => {
    if (item.value === null || !Number.isFinite(item.value)) return [];
    const x = data.length > 1 ? (index / (data.length - 1)) * 100 : 50;
    const y = 42 - ((item.value - minimum) / range) * 34;
    return [`${x},${y}`];
  }).join(' ');
  const total = values.reduce((sum, value) => sum + value, 0);
  const firstShare = total > 0 && values.length > 1 ? (values[0] / total) * 100 : 0;
  const barMaximum = Math.max(0, ...values);

  return (
    <article className="min-w-0 border border-paper-300 bg-paper-50 p-4">
      <h3 className="font-sans text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 min-h-10 text-xs leading-5 text-ink-500">{description}</p>
      <svg className="mt-3 h-16 w-full" viewBox="0 0 100 50" role="img" aria-label={`${title}. ${description}`}>
        <title>{title}</title>
        <desc>{description}</desc>
        {kind === 'line' && linePoints && (
          <>
            <polyline points={linePoints} fill="none" stroke="#0E4A6F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {linePoints.split(' ').map((point, index) => {
              const [cx, cy] = point.split(',');
              return <circle key={`${point}-${index}`} cx={cx} cy={cy} r="1.8" fill="#0E4A6F" />;
            })}
          </>
        )}
        {kind === 'bar' && data.map((item, index) => {
          if (item.value === null) return null;
          const value = item.value;
          const height = barMaximum > 0 ? (value / barMaximum) * 40 : 0;
          const width = Math.min(12, 72 / Math.max(data.length, 1));
          const x = 14 + (index * 72) / Math.max(data.length, 1);
          return <rect key={`${item.label}-${index}`} x={x} y={46 - height} width={width} height={height} rx="1" fill="#0E4A6F" opacity={0.45 + (index / Math.max(data.length, 1)) * 0.5} />;
        })}
        {kind === 'donut' && total > 0 && (
          <>
            <circle cx="50" cy="25" r="18" fill="none" stroke="#D9D2C4" strokeWidth="8" />
            <circle cx="50" cy="25" r="18" pathLength="100" fill="none" stroke="#0E4A6F" strokeWidth="8" strokeDasharray={`${firstShare} ${100 - firstShare}`} transform="rotate(-90 50 25)" />
          </>
        )}
        {!values.length && <text x="50" y="28" textAnchor="middle" fill="#777" fontSize="7">Belum ada data</text>}
      </svg>
      <p className="mt-2 font-mono text-[10px] text-gov-primary">Satuan: {unit}</p>
      <p className="mt-1 text-xs text-ink-500">Grafik ini memberi gambaran cepat tentang {title.toLocaleLowerCase('id-ID')} pada cakupan data terpilih.</p>
      <details className="mt-2 border-t border-paper-200 pt-2">
        <summary className="cursor-pointer text-xs font-medium text-gov-primary">Lihat data grafik</summary>
        <div className="mt-2 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-paper-300"><th className="py-1 pr-3 font-semibold">Kategori</th><th className="py-1 font-semibold">Nilai</th></tr></thead>
            <tbody>{data.map((item, index) => <tr key={`${item.label}-${index}`} className="border-b border-paper-200"><td className="py-1 pr-3">{item.label}</td><td className="py-1 font-mono">{item.value === null ? 'Tidak tersedia' : `${formatValue(item.value, 4)} ${unit}`}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-500">Tabel berisi angka yang diringkas pada grafik; data yang belum tersedia tidak dihitung sebagai nol.</p>
      </details>
    </article>
  );
}

function median2(values: number[]) {
  const sorted = [...values].sort((x, y) => x - y);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function finiteValue(row: DatasetRow, field: string) {
  const value = row[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function MiniScatterThumb({ rows }: { rows: { a: number; b: number }[] }) {
  if (!rows.length) {
    return <p className="text-xs text-ink-500">Belum ada pasangan data.</p>;
  }
  const medianA = median2(rows.map((row) => row.a));
  const medianB = median2(rows.map((row) => row.b));
  const minA = Math.min(...rows.map((row) => row.a));
  const maxA = Math.max(...rows.map((row) => row.a));
  const minB = Math.min(...rows.map((row) => row.b));
  const maxB = Math.max(...rows.map((row) => row.b));
  const spanA = maxA - minA || 1;
  const spanB = maxB - minB || 1;
  const points = rows.map((row) => ({
    x: 4 + ((row.a - minA) / spanA) * 92,
    y: 46 - ((row.b - minB) / spanB) * 40,
    color: row.a >= medianA ? (row.b >= medianB ? '#0E4A6F' : '#0891B2') : row.b >= medianB ? '#D9D2C4' : '#B45309',
  }));
  const midX = 4 + ((medianA - minA) / spanA) * 92;
  const midY = 46 - ((medianB - minB) / spanB) * 40;
  return (
    <svg className="mt-3 h-16 w-full" viewBox="0 0 100 50" role="img" aria-label="Sebaran kuadran provinsi (sprite)">
      <line x1={midX} y1="2" x2={midX} y2="48" stroke="#777" strokeWidth="0.4" strokeDasharray="2 2" />
      <line x1="2" y1={midY} x2="98" y2={midY} stroke="#777" strokeWidth="0.4" strokeDasharray="2 2" />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="1.7" fill={point.color} opacity="0.85" />
      ))}
    </svg>
  );
}

const TemporalArchipelagoScene = dynamic(() => import('./TemporalArchipelagoScene').then((module) => module.TemporalArchipelagoScene), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat scene kepulauan" description="Scene tiga dimensi dimuat khusus untuk ikhtisar." />,
});

function median(values: (number | null)[]) {
  const sorted = values.filter((value): value is number => typeof value === 'number').sort((a, b) => a - b);
  if (!sorted.length) return null;
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

export function GovOverview({
  rows,
  provinceCount,
  regionCount,
  sourceRowCount,
  datasetCount,
  regions,
  metrics,
  insights,
}: {
  rows: DatasetRow[];
  regions: Region[];
  metrics: MetricDefinition[];
  provinceCount: number;
  regionCount: number;
  sourceRowCount: number;
  datasetCount: number;
  insights?: GovInsightTeaser[];
}) {
  const { year } = useGovYear();
  const [selection, setSelection] = useState<RegionSelection>(NATIONAL_REGION_SELECTION);
  const scopedRows = filterRowsByRegionSelection(rows, selection, regions);
  const selectionName = getRegionSelectionName(selection, regions);
  const current = scopedRows.filter((row) => row.tahun_anggaran === year);
  const topRows = [...current]
    .sort((a, b) => (getMetricValue(b, 'composite_development_score') ?? -Infinity) - (getMetricValue(a, 'composite_development_score') ?? -Infinity))
    .slice(0, 10);
  const scatterRows = current.filter((row) => getMetricValue(row, 'fiscal_autonomy') !== null && getMetricValue(row, 'welfare_composite') !== null);
  const trendRows = [2020, 2021, 2022, 2023, 2024, 2025].map((targetYear) => {
    const annual = scopedRows.filter((row) => row.tahun_anggaran === targetYear);
    return { tahun_anggaran: targetYear, ipm: populationWeightedMean(annual, 'indeks_pembangunan_manusia_ipm') };
  });
  const currentIpm = current.filter((row) => typeof row.indeks_pembangunan_manusia_ipm === 'number');
  const ipmAverage = populationWeightedMean(currentIpm, 'indeks_pembangunan_manusia_ipm');
  const topFiscalRows = [...current]
    .filter((row) => getMetricValue(row, 'fiscal_autonomy') !== null)
    .sort((a, b) => (getMetricValue(b, 'fiscal_autonomy') ?? -Infinity) - (getMetricValue(a, 'fiscal_autonomy') ?? -Infinity))
    .slice(0, 5);
  const regionsWithIpm = currentIpm.length;
  const regionsWithoutIpm = Math.max(0, current.length - regionsWithIpm);
  const fiscalMedian = median(current.map((row) => getMetricValue(row, 'fiscal_autonomy')));
  const welfareAverage = populationWeightedMean(current, '_derived_welfare_composite');
  const governanceMedian = median(current.map((row) => getMetricValue(row, 'governance_digital')));
  const governanceAbove = current.filter((row) => {
    const value = getMetricValue(row, 'governance_digital');
    return value !== null && governanceMedian !== null && value > governanceMedian;
  }).length;
  const additionalReadings: GovInsightTeaser[] = [
    {
      id: 'pdrb-vs-employment',
      title: 'PDRB per kapita × pengangguran',
      metricALabel: 'PDRB per kapita ADHK (ribu Rp)',
      metricBLabel: 'Tingkat pengangguran terbuka (%)',
      year,
      href: '/gov/ekonomi',
      rows: current.flatMap((row) => {
        const a = finiteValue(row, 'pdrb_per_kapita_adhk_ribu_rp');
        const b = finiteValue(row, 'tingkat_pengangguran_terbuka_tpt_persen');
        return a === null || b === null ? [] : [{ a, b }];
      }),
    },
    {
      id: 'ipm-vs-poverty',
      title: 'IPM × penduduk miskin',
      metricALabel: 'Indeks pembangunan manusia (poin)',
      metricBLabel: 'Penduduk miskin (%)',
      year,
      href: '/gov/sosial-publik',
      rows: current.flatMap((row) => {
        const a = finiteValue(row, 'indeks_pembangunan_manusia_ipm');
        const b = finiteValue(row, 'persentase_penduduk_miskin_persen');
        return a === null || b === null ? [] : [{ a, b }];
      }),
    },
    {
      id: 'capital-vs-service',
      title: 'Belanja modal × akses layanan',
      metricALabel: 'Porsi belanja modal (%)',
      metricBLabel: 'Akses layanan (indeks relatif)',
      year,
      href: '/gov/infrastruktur',
      rows: current.flatMap((row) => {
        const a = finiteValue(row, '_derived_capital_share');
        const b = finiteValue(row, '_derived_service_access_index');
        return a === null || b === null ? [] : [{ a, b }];
      }),
    },
  ];
  const readingCards = [...(insights ?? []), ...additionalReadings].slice(0, 12);
  return (
    <div className="space-y-12 py-8">
      <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <p className="font-mono text-eyebrow uppercase text-gov-primary">{igsSite.hero.eyebrow}</p>
          <h1 className="mt-5 max-w-3xl font-sans text-4xl font-bold leading-[1.04] text-ink-900 sm:text-6xl lg:text-display">
            {igsSite.hero.titleStart}<br />{igsSite.hero.titleEndPrefix} <span className="text-gov-primary">{igsSite.hero.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl text-body text-ink-500">{igsSite.hero.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/gov/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-btn bg-gov-primary px-5 py-3 text-sm font-semibold text-paper-50 hover:bg-gov-primaryDeep">Buka Dashboard <ArrowRight aria-hidden="true" className="size-4" /></Link>
            <Link href="/gov/pemerintahan" className="font-sans text-sm font-semibold text-gov-primary underline decoration-paper-300 underline-offset-4">Jelajahi Bidang</Link>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-4 border-y border-paper-300 py-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-ink-500">TAHUN DATA</span><IgsYearSelector expanded />
            </div>
            <RegionHierarchySelector regions={regions} selection={selection} onChange={setSelection} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [`${datasetCount}`, 'Dataset sumber'],
              [`${regionCount}`, `Wilayah · ${provinceCount} provinsi`],
              ['6', 'Tahun tersedia'],
              [new Intl.NumberFormat('id-ID').format(sourceRowCount), 'Baris sumber'],
            ].map(([value, label]) => <div key={label} className="border-l-2 border-gov-primary pl-3"><p className="font-mono text-lg font-semibold text-gov-primary">{value}</p><p className="text-[11px] leading-4 text-ink-500">{label}</p></div>)}
          </div>
        </div>
        <TemporalArchipelagoScene rows={rows} regions={regions} className="lg:col-span-6 lg:scale-[1.03]" />
      </section>

      <section className="grid gap-5 lg:grid-cols-12" aria-label="Insight dan preview data IGS">
        <article className="border border-paper-300 bg-paper-50 p-6 lg:col-span-4">
          <p className="font-mono text-eyebrow uppercase text-gov-primary">Insight hari ini · data {year}</p>
          <h2 className="mt-3 font-sans text-h3 text-ink-900">Rerata IPM · {selectionName}</h2>
          <p className="mt-4 font-mono text-4xl font-semibold text-gov-primary">{ipmAverage === null ? 'Data tidak tersedia' : `${formatValue(ipmAverage, 1)} poin`}</p>
          <p className="mt-3 text-sm leading-6 text-ink-500">
            {ipmAverage === null
              ? `Belum ada nilai IPM yang tercatat untuk ${selectionName} pada ${year}.`
              : `Rerata berbobot populasi dihitung dari ${regionsWithIpm} wilayah dengan nilai IPM pada ${year}; nilai yang kosong tidak diimputasi.`}
          </p>
          <Link href="/gov/sosial-publik" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gov-primary underline decoration-paper-300 underline-offset-4">
            Baca indikator sosial <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </article>
        <div className="border border-paper-300 bg-paper-50 p-5 lg:col-span-8">
          <div className="mb-4">
            <p className="font-mono text-eyebrow uppercase text-gov-primary">Preview live</p>
            <h2 className="mt-2 font-sans text-h3 text-ink-900">Sekilas data wilayah</h2>
            <p className="mt-1 text-sm text-ink-500">Ringkasan mengikuti {selectionName} dan hanya memakai angka yang tersedia.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MiniPreviewChart
              title="Tren IPM"
              description={`Perubahan rerata IPM berbobot populasi pada ${selectionName} dari 2020 sampai 2025.`}
              kind="line"
              unit="poin"
              data={trendRows.map((row) => ({ label: String(row.tahun_anggaran), value: row.ipm }))}
            />
            <MiniPreviewChart
              title="Lima rasio fiskal tertinggi"
              description={`Lima wilayah dengan rasio PAD terhadap pendapatan terealisasi tertinggi pada ${year}.`}
              kind="bar"
              unit="%"
              data={topFiscalRows.map((row) => ({ label: String(row.nama_daerah ?? row.kode_wilayah), value: getMetricValue(row, 'fiscal_autonomy') }))}
            />
            <MiniPreviewChart
              title="Cakupan IPM"
              description={`Jumlah wilayah dengan dan tanpa nilai IPM tercatat pada ${year}.`}
              kind="donut"
              unit="wilayah"
              data={[
                { label: 'Dengan nilai IPM', value: regionsWithIpm },
                { label: 'Tanpa nilai IPM', value: regionsWithoutIpm },
              ]}
            />
          </div>
        </div>
      </section>

      <section>
        <GovPageHeader index="01" title="Bidang untuk dijelajahi" description="Setiap bagian menggabungkan indikator dari lebih dari satu dataset, dengan tahun dan cakupan data ditampilkan." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(Object.entries(bidang) as [string, { index: string; title: string; description: string; datasets: string[]; metrics: string[] }][]).map(([slug, section]) => {
            const visual = topicVisuals[slug];
            if (!visual) return null;
            return (
              <article key={slug} className="group overflow-hidden border border-paper-300 border-l-4 bg-paper-50 transition-shadow hover:shadow-md" style={{ borderLeftColor: visual.accent }}>
                <a href={visual.creditHref} target="_blank" rel="noreferrer" className="relative block h-40 overflow-hidden bg-paper-200" aria-label={`Sumber foto ${section.title}: ${visual.credit}`}>
                  <Image src={visual.image} alt={visual.imageAlt} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover grayscale transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute bottom-2 right-2 bg-paper-50/90 px-2 py-1 font-mono text-[10px] text-ink-700">{visual.credit}</span>
                </a>
                <div className="p-5">
                  <p className="font-mono text-xs" style={{ color: visual.accent }}>{section.index}</p>
                  <Link href={`/gov/${slug}`} className="mt-1 inline-flex items-center gap-2 font-sans text-xl font-semibold text-ink-900 hover:underline" style={{ textDecorationColor: visual.accent }}>
                    {section.title}<ArrowRight aria-hidden="true" className="size-4" style={{ color: visual.accent }} />
                  </Link>
                  <p className="mt-2 text-sm leading-6 text-ink-500">{section.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.metrics.slice(0, 2).map((metric) => {
                      const label = getIgsLabel(metric);
                      return <span key={metric} className="border px-2 py-1 font-mono text-[10px] text-ink-500" style={{ borderColor: visual.accent }}>{label}</span>;
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {readingCards.length ? (
        <section className="border-t border-paper-300 pt-8" aria-label="Lensa Data: insight lintas dataset">
          <p className="font-mono text-eyebrow uppercase text-gov-primary">Lensa Data · lintas dataset</p>
          <h2 className="mt-2 font-sans text-h3 text-ink-900">Dua belas pembacaan indikator</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">Sembilan analisis lintas dataset dan tiga pembacaan indikator tambahan. Setiap titik adalah wilayah dengan kedua nilai tersedia; garis tengah menunjukkan median, bukan hubungan sebab-akibat.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {readingCards.map((insight) => (
              <Link
                key={insight.id}
                href={insight.href ?? `/gov/insight/${insight.id}`}
                className="group flex flex-col border border-paper-300 bg-paper-50 p-4 transition-colors hover:border-gov-primary"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gov-primary">Tahun {insight.year} · {insight.rows.length} wilayah</p>
                <p className="mt-2 font-sans text-base font-semibold leading-6 text-ink-900 group-hover:underline">{insight.title}</p>
                <p className="mt-1 text-xs leading-5 text-ink-500">X: {insight.metricALabel}<br />Y: {insight.metricBLabel}</p>
                <MiniScatterThumb rows={insight.rows} />
                <span className="mt-auto pt-3 text-xs font-semibold text-gov-primary">Jelajahi pembacaan →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-4"><MetricTile label="Median kemandirian fiskal" value={fiscalMedian === null ? 'Data tidak tersedia' : `${formatValue(fiscalMedian)}%`} caption={`Rasio PAD / pendapatan terealisasi · ${year}`} /></div>
        <div className="min-w-0 lg:col-span-4"><MetricTile label="Indeks kesejahteraan" value={formatValue(welfareAverage, 2)} caption={`${selectionName} · rerata indeks relatif pada wilayah dengan data · ${year}`} /></div>
        <div className="min-w-0 lg:col-span-4"><MetricTile label="Di atas median tata kelola" value={`${governanceAbove} wilayah`} caption="Jumlah wilayah dengan nilai komposit tata kelola digital di atas median tahun terpilih." /></div>
        <div className="min-w-0 lg:col-span-7"><MetricChart title="Kemandirian fiskal × kesejahteraan" description="Setiap titik adalah satu provinsi. Kedua sumbu bersumber dari APBD dan indikator makro; hubungan bersifat deskriptif." data={scatterRows} xKey="_derived_fiscal_autonomy" yKey="_derived_welfare_composite" kind="scatter" unit="indeks" /></div>
        <div className="min-w-0 lg:col-span-5"><MetricChart title="Indeks pembangunan gabungan" description={`Sepuluh nilai relatif tertinggi yang tersedia untuk ${year}.`} data={topRows} xKey="nama_daerah" yKey="_derived_composite_development_score" kind="bar" unit="indeks relatif" /></div>
        <div className="min-w-0 lg:col-span-12">        <MetricChart title={`Rerata IPM · ${selectionName}`} description="Area memperlihatkan perubahan rerata IPM berbobot populasi dari tahun ke tahun; setiap nilai dihitung hanya dari wilayah dengan data yang tersedia." data={trendRows} xKey="tahun_anggaran" yKey="ipm" kind="area" unit="poin" /></div>
      </section>
      <section className="border-t border-paper-300 pt-5 text-xs text-ink-500">
        Cakupan aktual sumber: {regionCount} wilayah tersedia dalam CSV (38 provinsi dan {regionCount - provinceCount} kabupaten/kota), {sourceRowCount.toLocaleString('id-ID')} baris sumber. Tidak ada wilayah yang ditambahkan sebagai angka sintetis.
      </section>
      <section className="border-t border-paper-300 pt-8">
        <GovPageHeader index="06" title="Cari wilayah atau metrik" description="Temukan halaman wilayah dan indikator yang tersedia di dataset." />
        <GovSearch regions={regions} metrics={metrics} />
      </section>
    </div>
  );
}
