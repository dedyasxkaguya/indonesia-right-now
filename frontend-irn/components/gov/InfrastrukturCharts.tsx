'use client';

import { useState } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartPanel, type ChartTableRow } from '@/components/igs/EChartPanel';
import { StateCard } from '@/components/ui/StateCard';
import { IGS_PALETTE, IGS_SERIES_COLORS, igsAxis, igsAxisLabel, igsLegend, igsTooltip } from '@/lib/charts/igs-theme';
import { formatDecimal } from '@/lib/utils/format-number';
import type { Region } from '@/lib/data/schemas';
import { populationWeightedMean } from '@/lib/gov/aggregation';
import { getRegionSelectionName, getProvinceRegions, NATIONAL_REGION_SELECTION, type RegionSelection } from '@/lib/gov/region-selection';
import { RegionHierarchySelector } from '@/components/igs/RegionHierarchySelector';

export type InfrastrukturChartsProps = {
  mode: 'year' | 'all';
  chartYear: number | null;
  yearLabel: string;
  regions: Region[];
  stackingPerProvince: { name: string; nasionalKm: number | null; provinsiKm: number | null; kabkotaKm: number | null }[];
  authorityYears: { year: number; Nasional: number | null; Provinsi: number | null; KabupatenKota: number | null }[];
  radarRows: { code: string; name: string; population: number | null; elektrifikasi: number | null; air: number | null; sanitasi: number | null; jalanKabkota: number | null; akses: number | null }[];
  bulletRows: { name: string; elektrifikasi: number }[];
  rerataElektrifikasi: number | null;
  gapRows: { name: string; gap: number }[];
};

type CustomApi = {
  value: (index: number) => number | null;
  coord: (point: [number, number]) => [number, number];
  style: (style: Record<string, unknown>) => Record<string, unknown>;
};

function StackedAuthorityBar(props: { rows: InfrastrukturChartsProps['stackingPerProvince']; years: InfrastrukturChartsProps['authorityYears']; mode: 'year' | 'all'; yearLabel: string }) {
  if (props.mode === 'all') {
    const years = props.years.map((entry) => String(entry.year));
    const option: EChartsOption = {
      color: IGS_SERIES_COLORS,
      tooltip: igsTooltip({ trigger: 'axis', valueFormatter: (value: unknown) => (typeof value === 'number' ? `${new Intl.NumberFormat('id-ID').format(value)} km` : 'Data tidak tersedia') }),
      legend: igsLegend({ data: ['Jalan Nasional', 'Jalan Provinsi', 'Jalan Kabupaten/Kota'], top: 0 }),
      grid: { left: 60, right: 25, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: years, name: 'Tahun', ...igsAxis() },
      yAxis: { type: 'value', name: 'Panjang jalan mantap (km)', ...igsAxis({ axisLabel: igsAxisLabel({ formatter: (value: number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value) }) }) },
      series: [
        { name: 'Jalan Nasional', type: 'bar', stack: 'mantap', data: props.years.map((entry) => entry.Nasional), barMaxWidth: 34 },
        { name: 'Jalan Provinsi', type: 'bar', stack: 'mantap', data: props.years.map((entry) => entry.Provinsi), barMaxWidth: 34 },
        { name: 'Jalan Kabupaten/Kota', type: 'bar', stack: 'mantap', data: props.years.map((entry) => entry.KabupatenKota), barMaxWidth: 34 },
      ],
    };
    const rows: ChartTableRow[] = props.years.map((entry) => ({
      tahun: entry.year,
      jalan_nasional_mantap_km: entry.Nasional,
      jalan_provinsi_mantap_km: entry.Provinsi,
      jalan_kabkota_mantap_km: entry.KabupatenKota,
    }));
    return <EChartPanel
      title="Tumpukan panjang jalan mantap menurut kewenangan"
      description={`Total panjang jalan mantap (km) per kewenangan pada tahun-tahun yang memiliki data. Tahun tanpa data tetap kosong, bukan nol. Grafik memakai tabel di bawahnya.`}
      option={option}
      rows={rows}
      columns={[
        { key: 'tahun', label: 'Tahun' },
        { key: 'jalan_nasional_mantap_km', label: 'Jalan Nasional (km)' },
        { key: 'jalan_provinsi_mantap_km', label: 'Jalan Provinsi (km)' },
        { key: 'jalan_kabkota_mantap_km', label: 'Jalan Kabupaten/Kota (km)' },
      ]}
    />;
  }

  const rows = props.rows;
  if (!rows.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Kemantapan jalan menurut kewenangan belum tersedia untuk tahun terpilih." />;
  }
  const option: EChartsOption = {
    color: IGS_SERIES_COLORS,
    tooltip: igsTooltip({ trigger: 'axis', valueFormatter: (value: unknown) => (typeof value === 'number' ? `${new Intl.NumberFormat('id-ID').format(value)} km` : 'Data tidak tersedia') }),
    legend: igsLegend({ data: ['Jalan Nasional', 'Jalan Provinsi', 'Jalan Kabupaten/Kota'], top: 0, type: 'scroll' }),
    grid: { left: 120, right: 30, top: 40, bottom: 30 },
    xAxis: { type: 'value', name: 'Panjang mantap (km)', ...igsAxis({ axisLabel: igsAxisLabel({ formatter: (value: number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value) }) }) },
    yAxis: { type: 'category', data: rows.map((row) => row.name), ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9 }) }) },
    series: [
      { name: 'Jalan Nasional', type: 'bar', stack: 'mantap', data: rows.map((row) => row.nasionalKm), barMaxWidth: 14 },
      { name: 'Jalan Provinsi', type: 'bar', stack: 'mantap', data: rows.map((row) => row.provinsiKm), barMaxWidth: 14 },
      { name: 'Jalan Kabupaten/Kota', type: 'bar', stack: 'mantap', data: rows.map((row) => row.kabkotaKm), barMaxWidth: 14 },
    ],
  };
  const tableRows: ChartTableRow[] = rows.map((row) => ({
    provinsi: row.name,
    jalan_nasional_mantap_km: row.nasionalKm,
    jalan_provinsi_mantap_km: row.provinsiKm,
    jalan_kabkota_mantap_km: row.kabkotaKm,
  }));
  return <EChartPanel
    title={`Tumpukan panjang jalan mantap menurut kewenangan · ${props.yearLabel}`}
    description="Setiap batang menumpuk panjang jalan mantap (km) tiga kewenangan pada provinsi; provinsi dengan sebagian kewenangan berdata memperlihatkan tumpukan lebih pendek, bukan nol."
    option={option}
    rows={tableRows}
    columns={[
      { key: 'provinsi', label: 'Provinsi' },
      { key: 'jalan_nasional_mantap_km', label: 'Jalan Nasional (km)' },
      { key: 'jalan_provinsi_mantap_km', label: 'Jalan Provinsi (km)' },
      { key: 'jalan_kabkota_mantap_km', label: 'Jalan Kabupaten/Kota (km)' },
    ]}
    height={640}
    minWidth={520}
  />;
}

function InfrastructureRadar({ rows, regions, yearLabel }: { rows: InfrastrukturChartsProps['radarRows']; regions: Region[]; yearLabel: string }) {
  const [selection, setSelection] = useState<RegionSelection>(NATIONAL_REGION_SELECTION);
  const selectable = rows.filter((row) => (
    row.elektrifikasi !== null || row.air !== null || row.sanitasi !== null || row.jalanKabkota !== null || row.akses !== null
  ));
  const provinceRegions = getProvinceRegions(regions);
  const selectedName = getRegionSelectionName(selection, regions);
  const selectedCodes = selection.provinceCode
    ? new Set([selection.provinceCode])
    : new Set(provinceRegions
      .filter((region) => !selection.island || region.pulau_kawasan === selection.island)
      .map((region) => region.kode_wilayah));
  const selectedRows = selectable.filter((row) => selectedCodes.has(row.code));
  const selected = selection.provinceCode
    ? selectedRows.find((row) => row.code === selection.provinceCode)
    : selectedRows.length
      ? {
        code: selection.island ?? 'nasional',
        name: selectedName,
        population: null,
        elektrifikasi: populationWeightedMean(selectedRows.map((row) => ({ ...row, jumlah_penduduk_total_ribu_jiwa: row.population })), 'elektrifikasi'),
        air: populationWeightedMean(selectedRows.map((row) => ({ ...row, jumlah_penduduk_total_ribu_jiwa: row.population })), 'air'),
        sanitasi: populationWeightedMean(selectedRows.map((row) => ({ ...row, jumlah_penduduk_total_ribu_jiwa: row.population })), 'sanitasi'),
        jalanKabkota: populationWeightedMean(selectedRows.map((row) => ({ ...row, jumlah_penduduk_total_ribu_jiwa: row.population })), 'jalanKabkota'),
        akses: populationWeightedMean(selectedRows.map((row) => ({ ...row, jumlah_penduduk_total_ribu_jiwa: row.population })), 'akses'),
      }
      : undefined;
  if (!selected || !selectedRows.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Profil infrastruktur provinsi belum tersedia untuk tahun terpilih." />;
  }
  const indicators = [
    { key: 'elektrifikasi', label: 'Elektrifikasi (%)', value: selected.elektrifikasi },
    { key: 'air', label: 'Air minum layak (%)', value: selected.air },
    { key: 'sanitasi', label: 'Sanitasi layak (%)', value: selected.sanitasi },
    { key: 'jalanKabkota', label: 'Jalan kab/kota mantap (%)', value: selected.jalanKabkota },
    { key: 'akses', label: 'Akses layanan dasar (%)', value: selected.akses },
  ];
  if (indicators.some((indicator) => indicator.value === null)) {
    const unavailable = indicators.filter((indicator) => indicator.value === null).map((indicator) => indicator.label).join(', ');
    return (
      <StateCard
        variant="empty"
        title={`Profil ${selected.name} belum lengkap`}
        description={`Indikator ${unavailable} tidak tersedia untuk cakupan ${selected.name} pada ${yearLabel}; nilai kosong tidak diisi dengan nol.`}
      />
    );
  }
  const option: EChartsOption = {
    tooltip: igsTooltip({ trigger: 'item' }),
    radar: {
      indicator: indicators.map((indicator) => ({ name: indicator.label, max: 100 })),
      radius: '62%',
      axisName: { color: IGS_PALETTE.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: IGS_PALETTE.hairline } },
      splitArea: { areaStyle: { color: [IGS_PALETTE.card, '#F4EFE5'] } },
    },
    series: [{
      type: 'radar',
      symbolSize: 5,
      data: [{
        name: selected.name,
        value: indicators.map((indicator) => indicator.value),
        itemStyle: { color: IGS_PALETTE.navy },
        areaStyle: { color: IGS_PALETTE.navy, opacity: 0.16 },
        lineStyle: { color: IGS_PALETTE.navy, width: 2 },
      }],
    }],
  };
  const tableRows: ChartTableRow[] = indicators.map((indicator) => ({
    indikator: indicator.label,
    nilai: indicator.value,
    cakupan_provinsi: selection.provinceCode
      ? 1
      : selectedRows.filter((row) => row[indicator.key as keyof typeof row] !== null).length,
  }));
  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-md text-xs leading-5 text-ink-500">Profil provinsi atau agregat populasi untuk cakupan terpilih; satuan setiap indikator adalah persen.</p>
        <RegionHierarchySelector regions={regions} selection={selection} onChange={setSelection} />
      </div>
      <EChartPanel
        title={`Profil infrastruktur ${selected.name} · ${yearLabel}`}
        description="Elektrifikasi, air minum, sanitasi, jalan kabupaten/kota, dan akses dasar dalam persen. Agregat nasional/pulau berbobot populasi; indikator kosong tidak diubah menjadi nol."
        option={option}
        rows={tableRows}
        columns={[{ key: 'indikator', label: 'Indikator' }, { key: 'nilai', label: 'Nilai (%)' }, { key: 'cakupan_provinsi', label: 'Provinsi tersedia' }]}
      />
    </div>
  );
}

function ElectrificationBullet({ rows, rerata, yearLabel }: { rows: InfrastrukturChartsProps['bulletRows']; rerata: number | null; yearLabel: string }) {
  if (!rows.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Persentase elektrifikasi provinsi belum tersedia untuk tahun terpilih." />;
  }
  const bandHeightRatio = 0.84;
  const barHeightRatio = 0.44;
  const option: EChartsOption = {
    tooltip: { ...igsTooltip({ trigger: 'item' }), formatter: (params: unknown) => {
      const point = params as { data?: { name?: string; value?: [number, number] } };
      const value = point.data?.value?.[1];
      return `${point.data?.name ?? ''}: ${value === undefined || value === null ? 'Data tidak tersedia' : `${formatDecimal(value, 2)}%`}`;
    } },
    grid: { left: 120, right: 45, top: 20, bottom: 40 },
    xAxis: { type: 'value', min: 0, max: 100, name: 'Rasio elektrifikasi (%)', ...igsAxis() },
    yAxis: { type: 'category', data: rows.map((row) => row.name), ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9 }) }) },
    series: [{
      type: 'custom',
      coordinateSystem: 'cartesian2d',
      renderItem: (params, api) => {
        const customApi = api as unknown as CustomApi;
        const index = Number(customApi.value(0));
        const value = customApi.value(1);
        if (value === null || value === undefined) return null;
        const center = customApi.coord([0, index]);
        const next = customApi.coord([0, index + 1]);
        const rowHeight = Math.abs(next[1] - center[1]) || 10;
        const xAt = (v: number) => customApi.coord([v, index])[0];
        const bandHeight = rowHeight * bandHeightRatio;
        const barHeight = rowHeight * barHeightRatio;
        const bands: any[] = [];
        const thresholds = [
          { from: 0, to: 85, fill: '#EFE9DC' },
          { from: 85, to: 95, fill: '#E3DCCB' },
          { from: 95, to: 100, fill: '#D7CDB9' },
        ];
        thresholds.forEach((threshold) => {
          bands.push({
            type: 'rect',
            shape: {
              x: Math.min(xAt(threshold.from), xAt(threshold.to)),
              y: center[1] - bandHeight / 2,
              width: Math.max(0, xAt(threshold.to) - xAt(threshold.from)),
              height: bandHeight,
            },
            style: { fill: threshold.fill },
          });
        });
        bands.push({
          type: 'rect',
          shape: { x: xAt(0), y: center[1] - barHeight / 2, width: Math.max(0, xAt(value) - xAt(0)), height: barHeight },
          style: { fill: IGS_PALETTE.cyan },
        });
        if (rerata !== null) {
          bands.push({
            type: 'rect',
            shape: { x: xAt(rerata) - 1.25, y: center[1] - bandHeight / 2, width: 2.5, height: bandHeight },
            style: { fill: IGS_PALETTE.navy },
          });
        }
        return { type: 'group', children: bands };
      },
      encode: { x: 1, y: 0 },
      data: rows.map((row, index) => ({ name: row.name, value: [index, row.elektrifikasi] })),
    }],
  };
  const tableRows: ChartTableRow[] = rows.map((row) => ({
    provinsi: row.name,
    rasio_elektrifikasi: row.elektrifikasi,
    rerata_nasional: rerata,
    selisih_dari_rerata: rerata === null ? null : row.elektrifikasi - rerata,
  }));
  return <EChartPanel
    title={`Elektrifikasi terhadap koridor ambang · ${yearLabel}`}
    description={`Batang biru adalah rasio elektrifikasi provinsi; latar tiga warna menandai koridor 0–85%, 85–95%, dan 95–100%. Garis hitam tegak adalah rerata tertimbang nasional${rerata === null ? '' : ` (${formatDecimal(rerata, 2)}%)`} sebagai pembanding, bukan target resmi.`}
    option={option}
    rows={tableRows}
    columns={[
      { key: 'provinsi', label: 'Provinsi' },
      { key: 'rasio_elektrifikasi', label: 'Rasio elektrifikasi (%)' },
      { key: 'rerata_nasional', label: 'Rerata nasional (%)' },
      { key: 'selisih_dari_rerata', label: 'Selisih dari rerata (pp)' },
    ]}
    height={640}
    minWidth={520}
  />;
}

function RoadGapRanked({ rows, yearLabel }: { rows: InfrastrukturChartsProps['gapRows']; yearLabel: string }) {
  if (!rows.length) {
    return <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Kesenjangan kewenangan jalan belum tersedia untuk tahun terpilih." />;
  }
  const option: EChartsOption = {
    tooltip: igsTooltip({ trigger: 'axis', valueFormatter: (value: unknown) => (typeof value === 'number' ? `${formatDecimal(value, 2)} pp` : 'Data tidak tersedia') }),
    grid: { left: 120, right: 60, top: 20, bottom: 40 },
    xAxis: { type: 'value', name: 'Kesenjangan (pp)', ...igsAxis() },
    yAxis: { type: 'category', data: rows.map((row) => row.name), ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 9 }) }) },
    series: [{
      type: 'bar',
      barMaxWidth: 16,
      data: rows.map((row) => row.gap),
      itemStyle: { color: IGS_PALETTE.navy },
    }],
  };
  const tableRows: ChartTableRow[] = rows.map((row) => ({ provinsi: row.name, kesenjangan_pp: row.gap }));
  return <EChartPanel
    title={`Kesenjangan mantap pusat–daerah · ${yearLabel}`}
    description="Selisih persentase poin mantap jalan Nasional terhadap jalan Kabupaten/Kota pada provinsi yang memiliki kedua data; nilai negatif berarti jalan daerah lebih mantap."
    option={option}
    rows={tableRows}
    columns={[{ key: 'provinsi', label: 'Provinsi' }, { key: 'kesenjangan_pp', label: 'Kesenjangan (pp)' }]}
    height={640}
    minWidth={520}
  />;
}

export function InfrastrukturCharts(props: InfrastrukturChartsProps) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      <StackedAuthorityBar rows={props.stackingPerProvince} years={props.authorityYears} mode={props.mode} yearLabel={props.yearLabel} />
      <InfrastructureRadar rows={props.radarRows} regions={props.regions} yearLabel={props.yearLabel} />
      <ElectrificationBullet rows={props.bulletRows} rerata={props.rerataElektrifikasi} yearLabel={props.yearLabel} />
      <RoadGapRanked rows={props.gapRows} yearLabel={props.yearLabel} />
    </div>
  );
}
