'use client';

import { useEffect, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { echarts } from '@/components/igs/echarts-runtime';
import { EChartPanel, type ChartTableRow } from '@/components/igs/EChartPanel';
import { StateCard } from '@/components/ui/StateCard';
import type { GeoCollection } from '@/lib/data/geo-types';
import { IGS_PALETTE, igsAxis, igsAxisLabel, igsLegend, igsTooltip } from '@/lib/charts/igs-theme';
import { formatDecimal } from '@/lib/utils/format-number';

export type LingkunganChartsProps = {
  mode: 'year' | 'all';
  chartYear: number | null;
  yearLabel: string;
  facilities: { name: string; provinsi: string; latitude: number; longitude: number; masuk: number; kapasitas: number; ratio: number; overcapacity: boolean }[];
  typeYearEvents: { jenis: string; year: number; events: number; provinsi: number }[];
  jenisList: string[];
  heatRows: { provinsi: string; jenis: string; events: number }[];
};

const mapName = 'igs-provinces';

function WastePointMap({ facilities, yearLabel }: { facilities: LingkunganChartsProps['facilities']; yearLabel: string }) {
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (!echarts.getMap(mapName)) echarts.registerMap(mapName, result);
        setRegistered(true);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Geometri provinsi tidak dapat dimuat.');
      }
    }
    void boot();
    return () => controller.abort();
  }, []);

  const over = facilities.filter((facility) => facility.overcapacity);
  const under = facilities.filter((facility) => !facility.overcapacity);
  const option: EChartsOption = {
    tooltip: igsTooltip({ trigger: 'item', formatter: (params: unknown) => {
      const point = params as { seriesName?: string; data?: { name?: string; masuk: number; kapasitas: number; ratio: number; provinsi: string } };
      const value = point.data;
      if (!value || typeof value.masuk !== 'number') return String(point.seriesName ?? '');
      return `<strong>${value.name ?? ''}</strong><br/>${value.provinsi}<br/>Masuk: ${new Intl.NumberFormat('id-ID').format(value.masuk)} ton/hari<br/>Kapasitas: ${new Intl.NumberFormat('id-ID').format(value.kapasitas)} ton/hari<br/>Rasio: ${formatDecimal(value.ratio, 2)}×`;
    } }),
    legend: igsLegend({ data: ['Terkendali (≤ 1,0×)', 'Overcapacity (> 1,0×)'], bottom: 0, type: 'scroll' }),
    geo: {
      map: mapName,
      roam: true,
      selectedMode: false,
      zoom: 1.1,
      itemStyle: { areaColor: '#EDE8DF', borderColor: IGS_PALETTE.card, borderWidth: 0.8 },
      emphasis: { label: { show: false } },
    },
    series: [
      {
        name: 'Terkendali (≤ 1,0×)',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbolSize: (_value, params) => {
          const masuk = (params as unknown as { data: { masuk: number } }).data.masuk;
          return Math.min(26, Math.max(6, Math.sqrt(masuk) * 0.6));
        },
        data: under.map((facility) => ({
          name: facility.name,
          value: [facility.longitude, facility.latitude],
          masuk: facility.masuk,
          kapasitas: facility.kapasitas,
          ratio: facility.ratio,
          provinsi: facility.provinsi,
        })),
        itemStyle: { color: IGS_PALETTE.navy, opacity: 0.8, borderColor: IGS_PALETTE.card, borderWidth: 1 },
      },
      {
        name: 'Overcapacity (> 1,0×)',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbolSize: (_value, params) => {
          const masuk = (params as unknown as { data: { masuk: number } }).data.masuk;
          return Math.min(30, Math.max(8, Math.sqrt(masuk) * 0.6));
        },
        data: over.map((facility) => ({
          name: facility.name,
          value: [facility.longitude, facility.latitude],
          masuk: facility.masuk,
          kapasitas: facility.kapasitas,
          ratio: facility.ratio,
          provinsi: facility.provinsi,
        })),
        itemStyle: { color: IGS_PALETTE.amber, opacity: 0.9, borderColor: IGS_PALETTE.card, borderWidth: 1 },
      },
    ],
  };
  const tableRows: ChartTableRow[] = facilities.map((facility) => ({
    tpa: facility.name,
    provinsi: facility.provinsi,
    masuk_ton_hari: facility.masuk,
    kapasitas_ton_hari: facility.kapasitas,
    rasio: facility.ratio,
    status: facility.overcapacity ? 'Overcapacity' : 'Terkendali',
  }));
  if (error || !registered) {
    return (
      <div className="space-y-3">
        {error ? <StateCard variant="error" title="Peta tidak dapat dimuat" description={error} /> : <StateCard variant="loading" title="Memuat batas wilayah" description="Mendaftarkan geometri lokal sebelum titik TPA digambar." />}
        <details className="border border-paper-300 bg-paper-50 p-4">
          <summary className="cursor-pointer font-mono text-xs">Lihat data TPA sebagai tabel ({tableRows.length} baris)</summary>
          <div className="mt-3 max-h-64 overflow-auto">
            <table className="w-full min-w-max text-left text-xs">
              <thead><tr className="border-b border-paper-300">{['tpa', 'provinsi', 'masuk_ton_hari', 'kapasitas_ton_hari', 'rasio', 'status'].map((key) => <th key={key} className="whitespace-nowrap py-2 pr-4 font-semibold">{key}</th>)}</tr></thead>
              <tbody>{tableRows.map((row) => (
                <tr key={String(row.tpa)} className="border-b border-paper-200">
                  <td className="py-1.5 pr-4">{String(row.tpa)}</td>
                  <td className="py-1.5 pr-4">{String(row.provinsi)}</td>
                  <td className="py-1.5 pr-4 font-mono">{Number(row.masuk_ton_hari).toLocaleString('id-ID')}</td>
                  <td className="py-1.5 pr-4 font-mono">{Number(row.kapasitas_ton_hari).toLocaleString('id-ID')}</td>
                  <td className="py-1.5 pr-4 font-mono">{formatDecimal(Number(row.rasio), 2)}×</td>
                  <td className="py-1.5 pr-4">{String(row.status)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      </div>
    );
  }
  return <EChartPanel
    title={`Sebaran TPA menurut rasio kapasitas · ${yearLabel}`}
    description="Setiap titik adalah satu TPA pada koordinat sumbernya; warna amber menandai rasio masuk/kapasitas di atas 1,0. Ukuran titik mengikuti ton sampah masuk per hari."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'tpa', label: 'TPA' },
      { key: 'provinsi', label: 'Provinsi' },
      { key: 'masuk_ton_hari', label: 'Masuk (ton/hari)' },
      { key: 'kapasitas_ton_hari', label: 'Kapasitas (ton/hari)' },
      { key: 'rasio', label: 'Rasio kapasitas' },
      { key: 'status', label: 'Status' },
    ]}
    height={520}
  />;
}

function DisasterSmallMultiples({ rows, jenisList }: { rows: LingkunganChartsProps['typeYearEvents']; jenisList: string[] }) {
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
  const usable = jenisList.filter((jenis) => rows.some((row) => row.jenis === jenis && row.events > 0));
  if (!usable.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Kejadian bencana per jenis belum tersedia." />;
  }
  const option: EChartsOption = {
    tooltip: igsTooltip({ trigger: 'axis', valueFormatter: (value: unknown) => (typeof value === 'number' ? `${new Intl.NumberFormat('id-ID').format(value)} kejadian` : 'Data tidak tersedia') }),
    title: usable.map((jenis, index) => ({
      text: jenis,
      left: `${6 + (index % 2) * 52}%`,
      top: `${2 + Math.floor(index / 2) * 27}%`,
      textStyle: { color: IGS_PALETTE.muted, fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 11, fontWeight: 500 },
    })),
    grid: usable.map((_, index) => ({
      left: `${6 + (index % 2) * 52}%`,
      right: '4%',
      top: `${6 + Math.floor(index / 2) * 27}%`,
      height: '14%',
    })),
    xAxis: usable.map((_, index) => ({
      type: 'category',
      data: years.map(String),
      gridIndex: index,
      ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9 }) }),
    })),
    yAxis: usable.map((_, index) => ({
      type: 'value',
      gridIndex: index,
      ...igsAxis({ splitLine: { show: false }, axisLabel: { show: false } }),
    })),
    series: usable.map((jenis, index) => ({
      name: jenis,
      type: 'bar',
      barMaxWidth: 14,
      xAxisIndex: index,
      yAxisIndex: index,
      data: years.map((year) => rows.find((row) => row.jenis === jenis && row.year === year)?.events ?? null),
      itemStyle: { color: IGS_PALETTE.navy },
      tooltip: { valueFormatter: (value: unknown) => (typeof value === 'number' ? `${new Intl.NumberFormat('id-ID').format(value)} kejadian` : 'Data belum tersedia') },
    })),
  };
  const tableRows: ChartTableRow[] = rows.map((row) => ({
    jenis_bencana: row.jenis,
    tahun: row.year,
    jumlah_kejadian: row.events,
    provinsi_berdata: row.provinsi,
  }));
  return <EChartPanel
    title="Kejadian bencana per jenis dan tahun"
    description="Jumlah berkas kejadian bencana yang tercatat pada tahun-tahun sumber; cakupan provinsi berbeda antartahun dan tahun kosong tidak digambar sebagai nol."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'jenis_bencana', label: 'Jenis bencana' },
      { key: 'tahun', label: 'Tahun' },
      { key: 'jumlah_kejadian', label: 'Jumlah kejadian' },
      { key: 'provinsi_berdata', label: 'Provinsi berdata' },
    ]}
    height={640}
    minWidth={520}
  />;
}

function DisasterHeatmap({ rows, yearLabel }: { rows: LingkunganChartsProps['heatRows']; yearLabel: string }) {
  if (!rows.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Matriks bencana provinsi belum tersedia untuk tahun terpilih." />;
  }
  const provinces = [...new Set(rows.map((row) => row.provinsi))].sort((a, b) => a.localeCompare(b, 'id'));
  const jenisList = [...new Set(rows.map((row) => row.jenis))].sort((a, b) => a.localeCompare(b, 'id'));
  const rowIndex = new Map(provinces.map((name, index) => [name, index]));
  const columnIndex = new Map(jenisList.map((name, index) => [name, index]));
  const option: EChartsOption = {
    tooltip: igsTooltip({
      position: 'top',
      formatter: (params: unknown) => {
        const point = params as { data?: [number, number, number] };
        const [x, y, value] = point.data ?? [0, 0, 0];
        return `${provinces[y]} · ${jenisList[x]}<br/>Kejadian: ${new Intl.NumberFormat('id-ID').format(value)}`;
      },
    }),
    grid: { left: 130, right: 20, top: 20, bottom: 70 },
    xAxis: { type: 'category', data: jenisList, splitArea: { show: true }, ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9, rotate: 30 }) }) },
    yAxis: { type: 'category', data: provinces, splitArea: { show: true }, ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9 }) }) },
    visualMap: {
      min: 0,
      max: Math.max(1, ...rows.map((row) => row.events)),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: { color: ['#F2EDE3', '#0891B2', '#0E4A6F'] },
      text: ['Banyak', 'Sedikit'],
      textStyle: { color: IGS_PALETTE.muted, fontSize: 10 },
    },
    series: [{
      type: 'heatmap',
      data: rows.map((row) => [columnIndex.get(row.jenis) ?? 0, rowIndex.get(row.provinsi) ?? 0, row.events]),
    }],
  };
  const tableRows: ChartTableRow[] = rows.map((row) => ({
    provinsi: row.provinsi,
    jenis_bencana: row.jenis,
    jumlah_kejadian: row.events,
  }));
  void yearLabel;
  return <EChartPanel
    title={`Matriks bencana provinsi × jenis · ${yearLabel}`}
    description="Jumlah berkas kejadian bencana pada sel; provinsi atau jenis yang tidak tercatat dibiarkan kosong, bukan dinolkan."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'provinsi', label: 'Provinsi' },
      { key: 'jenis_bencana', label: 'Jenis bencana' },
      { key: 'jumlah_kejadian', label: 'Jumlah kejadian' },
    ]}
    height={640}
    minWidth={520}
  />;
}

export function LingkunganCharts(props: LingkunganChartsProps) {
  return (
    <div className="grid gap-5">
      <WastePointMap facilities={props.facilities} yearLabel={props.yearLabel} />
      <DisasterSmallMultiples rows={props.typeYearEvents} jenisList={props.jenisList} />
      <DisasterHeatmap rows={props.heatRows} yearLabel={props.yearLabel} />
    </div>
  );
}
