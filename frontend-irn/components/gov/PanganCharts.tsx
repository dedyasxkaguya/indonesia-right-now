'use client';

import type { EChartsOption } from 'echarts';
import { EChartPanel, type ChartTableRow } from '@/components/igs/EChartPanel';
import { StateCard } from '@/components/ui/StateCard';
import { IGS_PALETTE, IGS_SERIES_COLORS, igsAxis, igsAxisLabel, igsLegend, igsTooltip } from '@/lib/charts/igs-theme';
import { formatDecimal } from '@/lib/utils/format-number';

export type PanganChartsProps = {
  mode: 'year' | 'all';
  chartYear: number | null;
  yearLabel: string;
  provinceRows: { name: string; padiTon: number | null; berasTon: number | null; padiPerCapita: number | null; berasPerCapita: number | null }[];
  productivityRows: { name: string; productivity: number }[];
  totalsByYear: { year: number; padi: number | null; beras: number | null }[];
};

const idNumber = new Intl.NumberFormat('id-ID');

function PanganFunnel({ totals, yearLabel }: { totals: { padi: number | null; beras: number | null }; yearLabel: string }) {
  if (totals.padi === null && totals.beras === null) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Total produksi padi dan beras nasional belum tersedia untuk tahun terpilih." />;
  }
  const stages = [
    { name: 'Padi (GKG)', value: totals.padi, color: IGS_PALETTE.navy },
    { name: 'Beras', value: totals.beras, color: IGS_PALETTE.cyan },
  ].filter((stage) => stage.value !== null) as { name: string; value: number; color: string }[];
  if (!stages.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Total produksi padi dan beras nasional belum tersedia untuk tahun terpilih." />;
  }
  const option: EChartsOption = {
    tooltip: igsTooltip({ trigger: 'item', formatter: (params: unknown) => {
      const point = params as { name?: string; value?: number };
      return `${point.name}: ${point.value === undefined ? 'Data tidak tersedia' : `${idNumber.format(point.value)} ton`}`;
    } }),
    series: [{
      type: 'funnel',
      left: '14%',
      right: '14%',
      top: 20,
      bottom: 20,
      sort: 'none',
      gap: 4,
      minSize: '28%',
      label: { show: true, position: 'inside', color: IGS_PALETTE.card, fontFamily: '"IBM Plex Mono", ui-monospace, monospace', formatter: (params: unknown) => { const item = params as { name?: unknown; value?: unknown }; return `${String(item.name ?? '')} · ${idNumber.format(Number(item.value))} t`; } },
      data: stages.map((stage) => ({ name: stage.name, value: stage.value, itemStyle: { color: stage.color, borderColor: IGS_PALETTE.card, borderWidth: 2 } })),
    }],
  };
  const tableRows: ChartTableRow[] = stages.map((stage) => ({ tahapan: stage.name, produksi_ton: stage.value }));
  return <EChartPanel
    title={`Alur konversi padi menjadi beras nasional · ${yearLabel}`}
    description="Dua tahapan produksi nasional: total gabungan GKG padi, lalu total beras hasil konversi. Lebar segmen adalah total produksi; perbedaan ton terjadi karena perataan dan pelepasan selama konversi, bukan kehilangan data."
    option={option}
    rows={tableRows}
    columns={[{ key: 'tahapan', label: 'Tahapan' }, { key: 'produksi_ton', label: 'Produksi (ton)' }]}
  />;
}

function PanganGroupedBar({ rows, yearLabel }: { rows: PanganChartsProps['provinceRows']; yearLabel: string }) {
  const top = rows.filter((row) => row.padiTon !== null).slice(0, 10);
  if (!top.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Produksi padi per provinsi belum tersedia untuk tahun terpilih." />;
  }
  const option: EChartsOption = {
    color: IGS_SERIES_COLORS,
    tooltip: igsTooltip({ trigger: 'axis', valueFormatter: (value: unknown) => (typeof value === 'number' ? `${idNumber.format(value)} ton` : 'Data tidak tersedia') }),
    legend: igsLegend({ data: ['Padi (GKG)', 'Beras'], top: 0 }),
    grid: { left: 60, right: 20, top: 40, bottom: 60 },
    xAxis: { type: 'category', data: top.map((row) => row.name), ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9, rotate: 30 }) }) },
    yAxis: { type: 'value', name: 'Produksi (ton)', ...igsAxis({ axisLabel: igsAxisLabel({ formatter: (value: number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value) }) }) },
    series: [
      { name: 'Padi (GKG)', type: 'bar', data: top.map((row) => row.padiTon), barMaxWidth: 20 },
      { name: 'Beras', type: 'bar', data: top.map((row) => row.berasTon), barMaxWidth: 20 },
    ],
  };
  const tableRows: ChartTableRow[] = top.map((row) => ({
    provinsi: row.name,
    produksi_padi_ton: row.padiTon,
    produksi_beras_ton: row.berasTon,
  }));
  return <EChartPanel
    title={`Sepuluh provinsi produksi padi teratas · ${yearLabel}`}
    description="Perbandingan produksi gabung GKG padi dan beras per provinsi; provinsi tanpa salah satu nilai digambar hanya pada seri yang tercatat."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'provinsi', label: 'Provinsi' },
      { key: 'produksi_padi_ton', label: 'Produksi padi (ton)' },
      { key: 'produksi_beras_ton', label: 'Produksi beras (ton)' },
    ]}
  />;
}

function PanganRankedBar({ rows, yearLabel }: { rows: PanganChartsProps['provinceRows']; yearLabel: string }) {
  const ranked = rows.filter((row) => row.padiPerCapita !== null);
  if (!ranked.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Produksi padi per kapita belum tersedia untuk tahun terpilih." />;
  }
  const option: EChartsOption = {
    tooltip: igsTooltip({ trigger: 'axis', valueFormatter: (value: unknown) => (typeof value === 'number' ? `${formatDecimal(value, 4)} ton/jiwa` : 'Data tidak tersedia') }),
    grid: { left: 120, right: 45, top: 15, bottom: 40 },
    xAxis: { type: 'value', name: 'Ton per jiwa', ...igsAxis() },
    yAxis: { type: 'category', data: [...ranked].reverse().map((row) => row.name), ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9 }) }) },
    series: [{
      type: 'bar',
      barMaxWidth: 14,
      data: [...ranked].reverse().map((row) => row.padiPerCapita),
      itemStyle: { color: IGS_PALETTE.navy },
    }],
  };
  const tableRows: ChartTableRow[] = ranked.map((row) => ({
    provinsi: row.name,
    produksi_padi_ton: row.padiTon,
    produksi_padi_per_kapita: row.padiPerCapita,
  }));
  return <EChartPanel
    title={`Produksi padi per kapita semua provinsi · ${yearLabel}`}
    description="Peringkat provinsi menurut produksi padi GKG dibagi jumlah penduduk; provinsi tanpa data produksi atau penduduk tidak masuk peringkat."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'provinsi', label: 'Provinsi' },
      { key: 'produksi_padi_ton', label: 'Produksi padi (ton)' },
      { key: 'produksi_padi_per_kapita', label: 'Produksi per kapita (ton/jiwa)' },
    ]}
    height={640}
    minWidth={520}
  />;
}

function PanganTrend({ totals }: { totals: PanganChartsProps['totalsByYear'] }) {
  const years = totals.map((entry) => String(entry.year));
  if (!totals.some((entry) => entry.padi !== null || entry.beras !== null)) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Tren produksi nasional belum tersedia." />;
  }
  const option: EChartsOption = {
    color: IGS_SERIES_COLORS,
    tooltip: igsTooltip({ trigger: 'axis', valueFormatter: (value: unknown) => (typeof value === 'number' ? `${idNumber.format(value)} ton` : 'Data tidak tersedia') }),
    legend: igsLegend({ data: ['Padi (GKG)', 'Beras'], top: 0 }),
    grid: { left: 70, right: 25, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: years, name: 'Tahun', ...igsAxis() },
    yAxis: { type: 'value', name: 'Produksi nasional (ton)', ...igsAxis({ axisLabel: igsAxisLabel({ formatter: (value: number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value) }) }) },
    series: [
      { name: 'Padi (GKG)', type: 'line', data: totals.map((entry) => entry.padi), connectNulls: false, symbolSize: 7, itemStyle: { color: IGS_PALETTE.navy } },
      { name: 'Beras', type: 'line', data: totals.map((entry) => entry.beras), connectNulls: false, symbolSize: 7, itemStyle: { color: IGS_PALETTE.cyan } },
    ],
  };
  const tableRows: ChartTableRow[] = totals.map((entry) => ({
    tahun: entry.year,
    produksi_padi_ton: entry.padi,
    produksi_beras_ton: entry.beras,
  }));
  return <EChartPanel
    title="Tren produksi pangan nasional"
    description="Total produksi nasional per tahun dihitung hanya bila seluruh provinsi memiliki data; tahun dengan cakupan tidak lengkap dibiarkan kosong."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'tahun', label: 'Tahun' },
      { key: 'produksi_padi_ton', label: 'Produksi padi (ton)' },
      { key: 'produksi_beras_ton', label: 'Produksi beras (ton)' },
    ]}
  />;
}

function PanganProductivity({ rows, yearLabel }: { rows: PanganChartsProps['productivityRows']; yearLabel: string }) {
  if (!rows.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Produktivitas tertimbang provinsi belum tersedia untuk tahun terpilih." />;
  }
  const option: EChartsOption = {
    tooltip: igsTooltip({ trigger: 'axis', valueFormatter: (value: unknown) => (typeof value === 'number' ? `${formatDecimal(value, 2)} ton/ha` : 'Data tidak tersedia') }),
    grid: { left: 120, right: 45, top: 15, bottom: 40 },
    xAxis: { type: 'value', name: 'Ton per hektare', ...igsAxis() },
    yAxis: { type: 'category', data: [...rows].reverse().map((row) => row.name), ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9 }) }) },
    series: [{
      type: 'bar',
      barMaxWidth: 14,
      data: [...rows].reverse().map((row) => row.productivity),
      itemStyle: { color: IGS_PALETTE.cyan },
    }],
  };
  const tableRows: ChartTableRow[] = rows.map((row) => ({
    provinsi: row.name,
    produktivitas_ton_ha: row.productivity,
  }));
  return <EChartPanel
    title={`Produktivitas tanaman pangan tertimbang penduduk · ${yearLabel}`}
    description="Rata-rata produktivitas (ton/ha) provinsi yang ditimbang jumlah penduduk pada komoditas dengan produktivitas tercatat; komoditas tanpa nilai tidak diikutkan."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'provinsi', label: 'Provinsi' },
      { key: 'produktivitas_ton_ha', label: 'Produktivitas (ton/ha)' },
    ]}
    height={640}
    minWidth={520}
  />;
}

export function PanganCharts(props: PanganChartsProps) {
  const chartTotals = props.totalsByYear.find((entry) => entry.year === props.chartYear);
  return (
    <div className="grid gap-5">
      <PanganFunnel totals={chartTotals ?? { padi: null, beras: null }} yearLabel={props.yearLabel} />
      <PanganGroupedBar rows={props.provinceRows} yearLabel={props.yearLabel} />
      <PanganRankedBar rows={props.provinceRows} yearLabel={props.yearLabel} />
      <PanganTrend totals={props.totalsByYear} />
      <PanganProductivity rows={props.productivityRows} yearLabel={props.yearLabel} />
    </div>
  );
}
