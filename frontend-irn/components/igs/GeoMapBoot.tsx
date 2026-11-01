'use client';

import { useEffect, useState } from 'react';
import { echarts } from './echarts-runtime';
import type { EChartsOption } from 'echarts';
import type { ChartTableRow } from './EChartPanel';
import { EChartPanel } from './EChartPanel';
import type { GeoCollection } from '@/lib/data/geo-types';
import geoManifest from '@/lib/data/geo/manifest.json';
import { StateCard } from '@/components/ui/StateCard';

type MapValue = {
  kode_wilayah: string;
  nama_daerah: string;
  value: number | null;
};

const mapName = 'igs-provinces';

export function GeoMapBoot({
  title,
  description,
  data,
  metricLabel,
  unit,
  selectedCode,
  height = 420,
}: {
  title: string;
  description: string;
  data: MapValue[];
  metricLabel: string;
  unit: string;
  selectedCode?: string;
  height?: number;
}) {
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

  const values = data.flatMap((entry) => entry.value === null ? [] : [entry.value]);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const selectedData = data.map((entry) => ({
    name: entry.kode_wilayah,
    ...(entry.value === null ? {} : { value: entry.value }),
    ...(entry.kode_wilayah === selectedCode ? {
      itemStyle: { areaColor: '#B45309', borderColor: '#083856', borderWidth: 2 },
    } : {}),
  }));
  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (!params || typeof params !== 'object' || !('data' in params)) return '';
        const item = params.data as { value?: number | null; name?: string };
        const region = data.find((entry) => entry.kode_wilayah === item.name);
        const value = typeof item.value === 'number' ? `${item.value.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${unit}` : 'Data tidak tersedia';
        return `${region?.nama_daerah ?? item.name ?? ''}<br/>${metricLabel}: ${value}`;
      },
    },
    visualMap: values.length ? {
      min: minimum === maximum ? minimum - 1 : minimum,
      max: minimum === maximum ? maximum + 1 : maximum,
      left: 10,
      bottom: 10,
      calculable: true,
      inRange: { color: ['#DCE9F2', '#0891B2', '#0E4A6F'] },
      text: ['Tinggi', 'Rendah'],
      textStyle: { color: '#3A3733', fontSize: 10 },
    } : undefined,
    series: [{
      type: 'map',
      map: mapName,
      nameProperty: 'kode_wilayah',
      roam: true,
      selectedMode: false,
      data: selectedData,
      itemStyle: { areaColor: '#EDE8DF', borderColor: '#FDFBF6', borderWidth: 0.8 },
      emphasis: { label: { show: true, color: '#141414', fontSize: 10 }, itemStyle: { borderColor: '#083856', borderWidth: 1.5 } },
      label: { show: false },
    }],
  };
  const tableRows: ChartTableRow[] = data.map((entry) => ({
    wilayah: entry.nama_daerah,
    kode_wilayah: entry.kode_wilayah,
    [metricLabel]: entry.value,
    terpilih: entry.kode_wilayah === selectedCode ? 'Ya' : 'Tidak',
  }));
  const columns = [
    { key: 'wilayah', label: 'Wilayah' },
    { key: 'kode_wilayah', label: 'Kode' },
    { key: metricLabel, label: `${metricLabel} (${unit})` },
    ...(selectedCode ? [{ key: 'terpilih', label: 'Wilayah aktif' }] : []),
  ];

  if (error) return <div className="space-y-3"><StateCard variant="error" title="Peta tidak dapat dimuat" description={error} /><details className="border border-paper-300 bg-paper-50 p-4"><summary className="cursor-pointer font-mono text-xs">Lihat data peta sebagai tabel ({data.length} wilayah)</summary><GeoDataTable rows={tableRows} columns={columns} /><p className="mt-2 text-xs text-ink-500">Tabel ini mempertahankan nilai tiap wilayah jika batas peta tidak dapat dimuat.</p></details></div>;
  if (!registered) return <StateCard variant="loading" title="Memuat batas wilayah" description="Mendaftarkan geometri lokal sebelum peta digambar." />;

  return (
    <div>
      <EChartPanel title={title} description={description} option={option} rows={tableRows} columns={columns} height={height} />
      <p className="mt-2 text-[11px] text-ink-500">Batas provinsi: ans-4175/peta-indonesia-geojson (MIT), {geoManifest.province_features} feature. {geoManifest.csv_province_codes_without_source_geometry.length} kode provinsi pada CSV tidak memiliki geometri sumber. Peta bukan representasi batas administratif terbaru.</p>
    </div>
  );
}

function GeoDataTable({ rows, columns }: { rows: ChartTableRow[]; columns: { key: string; label: string }[] }) {
  return <div className="mt-3 max-h-64 overflow-auto"><table className="w-full min-w-max text-left text-xs"><thead><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap border-b border-paper-300 p-2">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row.kode_wilayah)}>{columns.map((column) => <td key={column.key} className="whitespace-nowrap border-b border-paper-200 p-2 font-mono">{row[column.key] === null ? 'Data tidak tersedia' : String(row[column.key])}</td>)}</tr>)}</tbody></table></div>;
}
