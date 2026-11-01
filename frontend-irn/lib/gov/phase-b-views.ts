import elektrifikasiJson from '@/lib/data/elektrifikasi.json';
import pertanianJson from '@/lib/data/pertanian.json';
import bencanaJson from '@/lib/data/bencana.json';
import airSanitasiJson from '@/lib/data/air_sanitasi.json';
import jalanJson from '@/lib/data/jalan.json';
import tpaJson from '@/lib/data/tpa.json';
import kumuhJson from '@/lib/data/kumuh.json';
import indikatorSosialJson from '@/lib/data/indikator_sosial.json';
import ekonomiJson from '@/lib/data/ekonomi.json';
import sourceManifest from '@/lib/data/index.json';
import {
  computeBasicServiceDeficit,
  computeDisasterExposure,
  computeFoodProductionPerCapita,
  computeFoodProductivity,
  computeInfrastructureAccess,
  computeRoadAuthorityGap,
  computeSlumReduction,
  computeWasteOvercapacity,
} from '@/lib/transformers/phase-b';
import type {
  AgricultureRow,
  DisasterRow,
  ElectrificationRow,
  PopulationRow,
  RoadConditionRow,
  SlumAreaRow,
  SocialIndicatorRow,
  WasteFacilityRow,
  WaterSanitationRow,
} from '@/lib/types/datasets';
import { populationWeightedAverage } from '@/lib/utils/weighting';
import { formatDecimal, formatInteger, formatPercentOne } from '@/lib/utils/format-number';

const electricityRows = elektrifikasiJson.rows as unknown as ElectrificationRow[];
const agricultureRows = pertanianJson.rows as unknown as AgricultureRow[];
const disasterRows = bencanaJson.rows as unknown as DisasterRow[];
const waterRows = airSanitasiJson.rows as unknown as WaterSanitationRow[];
const roadRows = jalanJson.rows as unknown as RoadConditionRow[];
const wasteRows = tpaJson.rows as unknown as WasteFacilityRow[];
const slumRows = kumuhJson.rows as unknown as SlumAreaRow[];
const socialRows = indikatorSosialJson.rows as unknown as SocialIndicatorRow[];
const economyRows = ekonomiJson.rows as unknown as {
  kode_wilayah: string;
  nama_daerah: string;
  tingkat_pemerintahan: string | null;
  tahun_anggaran: number;
  jumlah_penduduk_total_ribu_jiwa: number | null;
}[];

export type YearOption = { key: string; label: string; year: number | null };
export type KpiCell = {
  id: string;
  label: string;
  unit: string;
  value: string;
  caption: string;
  series: { year: number; value: number | null }[];
};
export type TrendSeries = {
  label: string;
  unit: string;
  points: { year: number; value: number | null }[];
};

function populationRows(): PopulationRow[] {
  const fromEconomy = economyRows
    .filter((row) => row.tingkat_pemerintahan === 'Provinsi' && row.tahun_anggaran <= 2022)
    .map((row) => ({
      kode_wilayah: row.kode_wilayah,
      nama_daerah: row.nama_daerah,
      tahun_anggaran: row.tahun_anggaran,
      jumlah_penduduk_total_ribu_jiwa: row.jumlah_penduduk_total_ribu_jiwa,
    }));
  const fromSocial = socialRows
    .filter((row) => row.tahun >= 2023)
    .map((row) => ({
      kode_wilayah: row.kode_wilayah,
      nama_daerah: row.nama_provinsi ?? row.kode_wilayah,
      tahun_anggaran: row.tahun,
      jumlah_penduduk_total_ribu_jiwa: row.jumlah_penduduk_total_ribu_jiwa,
    }));
  return [...fromEconomy, ...fromSocial];
}

const population = populationRows();
const populationByKey = new Map(
  population.map((row) => [`${row.kode_wilayah}::${row.tahun_anggaran}`, row.jumlah_penduduk_total_ribu_jiwa]),
);

export const DATA_UPDATED_AT_LABEL: string = (() => {
  const parsed = new Date(sourceManifest.updated_at);
  if (Number.isNaN(parsed.getTime())) return sourceManifest.updated_at;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
})();

function weightedAverage(rows: { kode_wilayah: string; value: number }[], tahun: number): number | null {
  const entries = rows.flatMap((row) => {
    const pop = populationByKey.get(`${row.kode_wilayah}::${tahun}`);
    return typeof pop === 'number' && pop > 0 ? [{ value: row.value, population: pop }] : [];
  });
  if (!entries.length) return null;
  const result = populationWeightedAverage(entries);
  return Number.isFinite(result) ? result : null;
}

function flatten<T extends { kode_wilayah: string }>(
  result: { byProvince: Record<string, T[]>; insufficient: boolean },
): T[] {
  if (result.insufficient) return [];
  return Object.values(result.byProvince).flat();
}

function yearOptions(years: number[]): YearOption[] {
  const unique = [...new Set(years)].sort((a, b) => b - a);
  return [
    ...unique.map((year) => ({ key: String(year), label: String(year), year })),
    { key: 'all', label: 'Semua Tahun', year: null },
  ];
}

export type ParsedYear = { mode: 'year' | 'all'; year: number | null; valid: boolean };

export function parseYearParam(raw: string | string[] | undefined, options: YearOption[]): ParsedYear {
  if (raw === 'all') return { mode: 'all', year: null, valid: true };
  if (typeof raw === 'string' && /^\d{4}$/.test(raw)) {
    const match = options.find((option) => option.year === Number(raw));
    if (match) return { mode: 'year', year: match.year, valid: true };
    return { mode: 'year', year: null, valid: false };
  }
  const latest = options.find((option) => option.year !== null);
  return { mode: 'year', year: latest ? latest.year : null, valid: true };
}

function formatUnit(unit: string, value: number): string {
  if (unit === '%') return formatPercentOne(value);
  if (unit === 'provinsi' || unit === 'lokasi') return formatInteger(value);
  if (unit === 'ton/jiwa') return formatDecimal(value, 3);
  if (unit === 'ton/ha') return formatDecimal(value, 2);
  if (unit === '×') return `${formatDecimal(value, 2)}×`;
  return formatDecimal(value, 1);
}

function kpiCell(
  id: string,
  label: string,
  unit: string,
  activeValue: number | null,
  activeYear: number | null,
  series: { year: number; value: number | null }[],
): KpiCell {
  return {
    id,
    label,
    unit,
    value: activeValue === null ? 'Data belum tersedia' : formatUnit(unit, activeValue),
    caption: activeValue === null
      ? 'Tidak ada tahun dengan data lengkap untuk indikator ini.'
      : `Tahun ${activeYear} · rata-rata tertimbang penduduk`,
    series,
  };
}

/** Pin KPI cells to the selected year in year mode; keep the latest full year in 'all' mode. */
function pinKpisToYear(kpis: KpiCell[], year: number | null): KpiCell[] {
  if (year === null) return kpis;
  return kpis.map((cell) => {
    const entry = cell.series.find((point) => point.year === year);
    if (!entry || entry.value === null) {
      return {
        ...cell,
        value: 'Data belum tersedia',
        caption: `Tahun ${year}: indikator tidak memiliki data lengkap. Baca sparkline untuk tahun-tahun lain.`,
      };
    }
    return {
      ...cell,
      value: formatUnit(cell.unit, entry.value),
      caption: `Tahun ${year} · rata-rata tertimbang penduduk`,
    };
  });
}

export const INSIGHT_TEASERS: Record<string, string[]> = {
  infrastruktur: ['road-vs-capital-spending', 'electricity-vs-poverty'],
  lingkungan: ['waste-vs-welfare', 'disaster-vs-poverty'],
  pangan: ['growth-vs-welfare', 'electricity-vs-poverty'],
};

// ---------------------------------------------------------------- Infrastruktur

export type InfrastrukturView = {
  mode: 'year' | 'all';
  year: number | null;
  yearLabel: string;
  chartYear: number | null;
  options: YearOption[];
  lastUpdated: string;
  kpis: KpiCell[];
  stackingPerProvince: { name: string; nasionalKm: number | null; provinsiKm: number | null; kabkotaKm: number | null }[];
  authorityYears: { year: number; Nasional: number | null; Provinsi: number | null; KabupatenKota: number | null }[];
  radarRows: { code: string; name: string; population: number | null; elektrifikasi: number | null; air: number | null; sanitasi: number | null; jalanKabkota: number | null; akses: number | null }[];
  bulletRows: { name: string; elektrifikasi: number }[];
  rerataElektrifikasi: number | null;
  gapRows: { name: string; gap: number }[];
  trends: TrendSeries[];
};

export function buildInfrastrukturView(rawYear: string | string[] | undefined): InfrastrukturView {
  const options = yearOptions([
    ...electricityRows.map((row) => row.tahun),
    ...roadRows.map((row) => row.tahun),
    ...slumRows.map((row) => row.tahun),
    ...waterRows.map((row) => row.tahun),
  ]);
  const parsed = parseYearParam(rawYear, options);
  const mode = parsed.mode;
  const latestYear = (options.find((option) => option.year !== null)?.year ?? null);
  const year = mode === 'all' ? null : parsed.year;
  const chartYear = year ?? (latestYear as number);

  type YearStats = {
    accessRows: { kode_wilayah: string; value: number }[];
    deficitRows: { kode_wilayah: string; value: number }[];
    gapRows: { kode_wilayah: string; name: string; value: number }[];
    slumRows: { kode_wilayah: string; value: number }[];
    voltageRows: { kode_wilayah: string; name: string; value: number }[];
    radarRows: InfrastrukturView['radarRows'];
    stack: InfrastrukturView['stackingPerProvince'];
    authority: { nasional: number | null; provinsi: number | null; kabkota: number | null };
  };

  const statsPerYear = new Map<number, YearStats>();
  const yearValues = options.filter((option) => option.year !== null).map((option) => option.year as number);
  for (const statYear of yearValues) {
    const electrificationYear = electricityRows.filter((row) => row.tahun === statYear);
    const waterYear = waterRows.filter((row) => row.tahun === statYear);
    const roadYear = roadRows.filter((row) => row.tahun === statYear);
    const slumYear = slumRows.filter((row) => row.tahun === statYear);

    const access = computeInfrastructureAccess(electrificationYear, waterYear, roadYear);
    const accessRows = flatten(access).map((row) => ({ kode_wilayah: row.kode_wilayah, value: row.akses_layanan_dasar }));
    const deficitRows = flatten(computeBasicServiceDeficit(access)).map((row) => ({
      kode_wilayah: row.kode_wilayah,
      value: row.defisit_layanan_dasar,
    }));
    const gapRows = flatten(computeRoadAuthorityGap(roadYear)).map((row) => ({
      kode_wilayah: row.kode_wilayah,
      name: row.nama_provinsi,
      value: row.kesenjangan_jalan_persen_poin,
    }));
    const slumRes = flatten(computeSlumReduction(slumYear)).map((row) => ({
      kode_wilayah: row.kode_wilayah,
      value: row.pengurangan_kumuh_persen,
    }));

    const accessByCode = new Map(accessRows.map((row) => [row.kode_wilayah, row.value]));
    const radarRowsInfra = electrificationYear.map((row) => {
      const waterMatch = waterYear.find((entry) => entry.kode_wilayah === row.kode_wilayah);
      const kabkotaRoad = roadYear.find((entry) => (
        entry.kode_wilayah === row.kode_wilayah && entry.tingkat_kewenangan === 'Kabupaten/Kota'
      ));
      return {
        code: row.kode_wilayah,
        name: row.nama_provinsi,
        population: populationByKey.get(`${row.kode_wilayah}::${statYear}`) ?? null,
        elektrifikasi: row.rasio_elektrifikasi_total_persen,
        air: waterMatch ? waterMatch.persen_air_minum_layak : null,
        sanitasi: waterMatch ? waterMatch.persen_sanitasi_layak : null,
        jalanKabkota: kabkotaRoad ? kabkotaRoad.persen_mantap : null,
        akses: accessByCode.get(row.kode_wilayah) ?? null,
      };
    });

    const mantapBy = (name: string) => {
      const rows = roadYear.filter((row) => row.tingkat_kewenangan === name);
      const parts = rows.map((row) => row.mantap_km).filter((value): value is number => typeof value === 'number');
      return parts.length ? parts.reduce((sum, value) => sum + value, 0) : null;
    };
    const stack = electrificationYear.map((row) => {
      const nasional = roadYear.find((entry) => (
        entry.kode_wilayah === row.kode_wilayah && entry.tingkat_kewenangan === 'Nasional'
      ));
      const provinsi = roadYear.find((entry) => (
        entry.kode_wilayah === row.kode_wilayah && entry.tingkat_kewenangan === 'Provinsi'
      ));
      const kabkota = roadYear.find((entry) => (
        entry.kode_wilayah === row.kode_wilayah && entry.tingkat_kewenangan === 'Kabupaten/Kota'
      ));
      return {
        name: row.nama_provinsi,
        nasionalKm: nasional ? nasional.mantap_km : null,
        provinsiKm: provinsi ? provinsi.mantap_km : null,
        kabkotaKm: kabkota ? kabkota.mantap_km : null,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'id'));

    statsPerYear.set(statYear, {
      accessRows,
      deficitRows,
      gapRows,
      slumRows: slumRes,
      voltageRows: electrificationYear.flatMap((row) => (
        row.rasio_elektrifikasi_total_persen === null
          ? []
          : [{ kode_wilayah: row.kode_wilayah, name: row.nama_provinsi, value: row.rasio_elektrifikasi_total_persen }]
      )),
      radarRows: radarRowsInfra,
      stack,
      authority: {
        nasional: mantapBy('Nasional'),
        provinsi: mantapBy('Provinsi'),
        kabkota: mantapBy('Kabupaten/Kota'),
      },
    });
  }

  const seriesFor = (
    selector: (stats: YearStats) => { kode_wilayah: string; value: number }[],
  ): { year: number; value: number | null }[] => yearValues.sort((a, b) => a - b).map((statYear) => ({
    year: statYear,
    value: weightedAverage(selector(statsPerYear.get(statYear)!), statYear),
  }));

  const accessSeries = seriesFor((stats) => stats.accessRows);
  const deficitSeries = seriesFor((stats) => stats.deficitRows);
  const gapSeries = seriesFor((stats) => stats.gapRows);
  const slumSeries = seriesFor((stats) => stats.slumRows);

  const kpis = [
    kpiCell('access', 'Akses Layanan Dasar', '%', accessSeries.findLast((entry) => entry.value !== null)?.value ?? null, accessSeries.findLast((entry) => entry.value !== null)?.year ?? null, accessSeries),
    kpiCell('gap', 'Kesenjangan Jalan Pusat–Daerah', 'pp', gapSeries.findLast((entry) => entry.value !== null)?.value ?? null, gapSeries.findLast((entry) => entry.value !== null)?.year ?? null, gapSeries),
    kpiCell('slum', 'Pengurangan Kawasan Kumuh', '%', slumSeries.findLast((entry) => entry.value !== null)?.value ?? null, slumSeries.findLast((entry) => entry.value !== null)?.year ?? null, slumSeries),
    kpiCell('deficit', 'Defisit Layanan Dasar', '%', deficitSeries.findLast((entry) => entry.value !== null)?.value ?? null, deficitSeries.findLast((entry) => entry.value !== null)?.year ?? null, deficitSeries),
  ];

  const chartData = statsPerYear.get(chartYear);
  const authorityYears = yearValues.sort((a, b) => a - b).map((statYear) => {
    const stats = statsPerYear.get(statYear)!;
    return {
      year: statYear,
      Nasional: stats.authority.nasional,
      Provinsi: stats.authority.provinsi,
      KabupatenKota: stats.authority.kabkota,
    };
  });
  const rerataElektrifikasi = chartData
    ? weightedAverage(chartData.voltageRows.map((row) => ({ kode_wilayah: row.kode_wilayah, value: row.value })), chartYear)
    : null;

  return {
    mode,
    year,
    yearLabel: mode === 'all' ? 'Semua tahun' : String(year),
    chartYear,
    options,
    lastUpdated: DATA_UPDATED_AT_LABEL,
    kpis: pinKpisToYear(kpis, year),
    stackingPerProvince: chartData ? chartData.stack : [],
    authorityYears,
    radarRows: chartData ? chartData.radarRows : [],
    bulletRows: chartData
      ? chartData.voltageRows
        .map((row) => ({ name: row.name, elektrifikasi: row.value }))
        .sort((a, b) => a.elektrifikasi - b.elektrifikasi)
      : [],
    rerataElektrifikasi,
    gapRows: chartData
      ? chartData.gapRows.filter((row) => Number.isFinite(row.value)).map((row) => ({ name: row.name, gap: row.value }))
      : [],
    trends: [
      { label: 'Akses Layanan Dasar', unit: '%', points: accessSeries },
      { label: 'Kesenjangan Jalan Pusat–Daerah', unit: 'pp', points: gapSeries },
      { label: 'Pengurangan Kawasan Kumuh', unit: '%', points: slumSeries },
      { label: 'Defisit Layanan Dasar', unit: '%', points: deficitSeries },
    ],
  };
}

// ---------------------------------------------------------------- Lingkungan

export type LingkunganView = {
  mode: 'year' | 'all';
  year: number | null;
  yearLabel: string;
  chartYear: number | null;
  options: YearOption[];
  lastUpdated: string;
  kpis: KpiCell[];
  facilities: { name: string; provinsi: string; latitude: number; longitude: number; masuk: number; kapasitas: number; ratio: number; overcapacity: boolean }[];
  provinsiWaste: { name: string; over: number; measured: number; maxRatio: number }[];
  typeYearEvents: { jenis: string; year: number; events: number; provinsi: number }[];
  heatRows: { provinsi: string; jenis: string; events: number }[];
  jenisList: string[];
  trends: TrendSeries[];
};

export function buildLingkunganView(rawYear: string | string[] | undefined): LingkunganView {
  const options = yearOptions(disasterRows.map((row) => row.tahun));
  const parsed = parseYearParam(rawYear, options);
  const mode = parsed.mode;
  const latestYear = options.find((option) => option.year !== null)?.year ?? null;
  const year = mode === 'all' ? null : parsed.year;
  const chartYear = year ?? (latestYear as number);

  type YearStats = {
    exposureRows: { kode_wilayah: string; value: number }[];
    facilities: LingkunganView['facilities'];
    provinsiWaste: LingkunganView['provinsiWaste'];
    slumRows: { kode_wilayah: string; value: number }[];
    heatRows: LingkunganView['heatRows'];
  };

  const statsPerYear = new Map<number, YearStats>();
  const yearValues = options.filter((option) => option.year !== null).map((option) => option.year as number);
  for (const statYear of yearValues) {
    const disasterYear = disasterRows.filter((row) => row.tahun === statYear);
    const exposureResult = computeDisasterExposure(disasterYear, population);
    const exposureRows = flatten(exposureResult).map((row) => ({
      kode_wilayah: row.kode_wilayah,
      value: row.indeks_paparan_bencana,
    }));

    const wasteYear = wasteRows.filter((row) => row.tahun === statYear);
    const waste = computeWasteOvercapacity(wasteYear);
    const facilities = waste.insufficient ? [] : waste.facilities
      .filter((facility) => facility.tahun === statYear)
      .map((facility) => ({
        name: facility.nama_tpa,
        provinsi: facility.nama_provinsi,
        latitude: facility.latitude,
        longitude: facility.longitude,
        masuk: facility.sampah_masuk_ton_per_hari,
        kapasitas: facility.kapasitas_desain_ton_per_hari,
        ratio: facility.rasio_kapasitas,
        overcapacity: facility.overcapacity,
      }));
    const provinsiWaste = Object.values(waste.byProvince)
      .flat()
      .filter((row) => row.tahun === statYear)
      .map((row) => ({
        name: row.nama_provinsi,
        over: row.jumlah_tpa_overcapacity,
        measured: row.jumlah_tpa_terukur,
        maxRatio: row.rasio_maksimum,
      }));

    const slumRes = flatten(computeSlumReduction(slumRows.filter((row) => row.tahun === statYear))).map((row) => ({
      kode_wilayah: row.kode_wilayah,
      value: row.pengurangan_kumuh_persen,
    }));

    const heatBy = new Map<string, { provinsi: string; jenis: string; events: number }>();
    disasterYear.forEach((row) => {
      if (row.jenis_bencana === null) return;
      const key = `${row.nama_provinsi}\u0000${row.jenis_bencana}`;
      const current = heatBy.get(key);
      if (current) current.events += row.jumlah_kejadian ?? 0;
      else heatBy.set(key, { provinsi: row.nama_provinsi, jenis: row.jenis_bencana, events: row.jumlah_kejadian ?? 0 });
    });

    statsPerYear.set(statYear, {
      exposureRows,
      facilities,
      provinsiWaste,
      slumRows: slumRes,
      heatRows: [...heatBy.values()],
    });
  }

  const exposureSeries = yearValues.sort((a, b) => a - b).map((statYear) => ({
    year: statYear,
    value: weightedAverage(statsPerYear.get(statYear)!.exposureRows, statYear),
  }));
  const slumSeries = yearValues.sort((a, b) => a - b).map((statYear) => ({
    year: statYear,
    value: weightedAverage(statsPerYear.get(statYear)!.slumRows.map((row) => ({ kode_wilayah: row.kode_wilayah, value: row.value })), statYear),
  }));
  const overSeries = yearValues.sort((a, b) => a - b).map((statYear) => {
    const rows = statsPerYear.get(statYear)!.provinsiWaste;
    return { year: statYear, value: rows.length ? rows.reduce((sum, row) => sum + row.over, 0) : null };
  });
  const maxRatioSeries = yearValues.sort((a, b) => a - b).map((statYear) => {
    const ratios = statsPerYear.get(statYear)!.provinsiWaste.map((row) => row.maxRatio).filter((value) => Number.isFinite(value));
    return { year: statYear, value: ratios.length ? Math.max(...ratios) : null };
  });

  const jenisList = [...new Set(disasterRows.map((row) => row.jenis_bencana).filter((value): value is string => value !== null))]
    .sort((a, b) => a.localeCompare(b, 'id'));
  const typeYearEvents = jenisList.flatMap((jenis) => yearValues.sort((a, b) => a - b).map((statYear) => {
    const rows = disasterRows.filter((row) => row.tahun === statYear && row.jenis_bencana === jenis);
    const provinsi = new Set(rows.map((row) => row.kode_wilayah));
    return {
      jenis,
      year: statYear,
      events: rows.reduce((sum, row) => sum + (row.jumlah_kejadian ?? 0), 0),
      provinsi: provinsi.size,
    };
  }));

  const kpis = [
    kpiCell('exposure', 'Indeks Paparan Bencana', 'per 1.000 jiwa', exposureSeries.findLast((entry) => entry.value !== null)?.value ?? null, exposureSeries.findLast((entry) => entry.value !== null)?.year ?? null, exposureSeries),
    kpiCell('overcapacity', 'TPA Overcapacity', 'lokasi', overSeries.findLast((entry) => entry.value !== null)?.value ?? null, overSeries.findLast((entry) => entry.value !== null)?.year ?? null, overSeries),
    kpiCell('maxRatio', 'Rasio Maksimum TPA', '×', maxRatioSeries.findLast((entry) => entry.value !== null)?.value ?? null, maxRatioSeries.findLast((entry) => entry.value !== null)?.year ?? null, maxRatioSeries),
    kpiCell('slum', 'Pengurangan Kawasan Kumuh', '%', slumSeries.findLast((entry) => entry.value !== null)?.value ?? null, slumSeries.findLast((entry) => entry.value !== null)?.year ?? null, slumSeries),
  ];

  const chartData = statsPerYear.get(chartYear);

  return {
    mode,
    year,
    yearLabel: mode === 'all' ? 'Semua tahun' : String(year),
    chartYear,
    options,
    lastUpdated: DATA_UPDATED_AT_LABEL,
    kpis: pinKpisToYear(kpis, year),
    facilities: chartData ? chartData.facilities : [],
    provinsiWaste: chartData ? chartData.provinsiWaste : [],
    typeYearEvents,
    heatRows: chartData ? chartData.heatRows : [],
    jenisList,
    trends: [
      { label: 'Indeks Paparan Bencana', unit: 'per 1.000 jiwa', points: exposureSeries },
      { label: 'TPA Overcapacity', unit: 'lokasi', points: overSeries },
      { label: 'Pengurangan Kawasan Kumuh', unit: '%', points: slumSeries },
    ],
  };
}

// ---------------------------------------------------------------- Pangan

export type PanganView = {
  mode: 'year' | 'all';
  year: number | null;
  yearLabel: string;
  chartYear: number | null;
  options: YearOption[];
  lastUpdated: string;
  kpis: KpiCell[];
  provinceRows: { name: string; padiTon: number | null; berasTon: number | null; padiPerCapita: number | null; berasPerCapita: number | null }[];
  productivityRows: { name: string; productivity: number }[];
  totalsByYear: { year: number; padi: number | null; beras: number | null }[];
  trends: TrendSeries[];
};

export function buildPanganView(rawYear: string | string[] | undefined): PanganView {
  const options = yearOptions(agricultureRows.map((row) => row.tahun));
  const parsed = parseYearParam(rawYear, options);
  const mode = parsed.mode;
  const latestYear = options.find((option) => option.year !== null)?.year ?? null;
  const year = mode === 'all' ? null : parsed.year;
  const chartYear = year ?? (latestYear as number);

  type YearStats = {
    perCapita: Map<string, { name: string; padiPerCapita: number | null; berasPerCapita: number | null; padiTon: number | null; berasTon: number | null }>;
    productivity: { kode_wilayah: string; name: string; value: number }[];
  };

  const statsPerYear = new Map<number, YearStats>();
  const yearValues = options.filter((option) => option.year !== null).map((option) => option.year as number);
  for (const statYear of yearValues) {
    const agricultureYear = agricultureRows.filter((row) => row.tahun === statYear);
    const foodResult = computeFoodProductionPerCapita(agricultureYear, population);
    const perCapitaRows = flatten(foodResult).filter((row) => row.tahun === statYear);
    const perCapita = new Map<string, { name: string; padiPerCapita: number | null; berasPerCapita: number | null; padiTon: number | null; berasTon: number | null }>();
    perCapitaRows.forEach((row) => {
      perCapita.set(row.kode_wilayah, {
        name: row.nama_provinsi,
        padiPerCapita: row.produksi_padi_per_kapita,
        berasPerCapita: row.produksi_beras_per_kapita,
        padiTon: row.produksi_padi_ton,
        berasTon: row.produksi_beras_ton,
      });
    });

    const productivityResult = computeFoodProductivity(
      agricultureYear.filter((row) => row.produktivitas_ton_per_ha !== null),
      population,
    );
    const productivity = flatten(productivityResult).map((row) => ({
      kode_wilayah: row.kode_wilayah,
      name: row.nama_provinsi,
      value: row.produktivitas_rata_rata_ton_per_ha,
    }));

    statsPerYear.set(statYear, { perCapita, productivity });
  }

  // National totals per year come directly from complete Padi/Beras rows (no imputation).
  const totalsByYear = yearValues.sort((a, b) => a - b).map((statYear) => {
    const padi = agricultureRows
      .filter((row) => row.tahun === statYear && row.komoditas === 'Padi')
      .map((row) => row.produksi_ton)
      .filter((value): value is number => value !== null);
    const beras = agricultureRows
      .filter((row) => row.tahun === statYear && row.komoditas === 'Beras')
      .map((row) => row.produksi_ton)
      .filter((value): value is number => value !== null);
    return {
      year: statYear,
      padi: padi.length === 38 ? padi.reduce((sum, value) => sum + value, 0) : null,
      beras: beras.length === 38 ? beras.reduce((sum, value) => sum + value, 0) : null,
    };
  });

  const padiPerSeries = yearValues.sort((a, b) => a - b).map((statYear) => {
    const stats = statsPerYear.get(statYear)!;
    const rows = [...stats.perCapita.entries()]
      .filter(([, row]) => row.padiPerCapita !== null)
      .map(([kode, row]) => ({ kode_wilayah: kode, value: row.padiPerCapita as number }));
    return { year: statYear, value: weightedAverage(rows, statYear) };
  });
  const berasPerSeries = yearValues.sort((a, b) => a - b).map((statYear) => {
    const stats = statsPerYear.get(statYear)!;
    const rows = [...stats.perCapita.entries()]
      .filter(([, row]) => row.berasPerCapita !== null)
      .map(([kode, row]) => ({ kode_wilayah: kode, value: row.berasPerCapita as number }));
    return { year: statYear, value: weightedAverage(rows, statYear) };
  });
  const productivitySeries = yearValues.sort((a, b) => a - b).map((statYear) => ({
    year: statYear,
    value: weightedAverage(statsPerYear.get(statYear)!.productivity.map((row) => ({ kode_wilayah: row.kode_wilayah, value: row.value })), statYear),
  }));
  // Surplus = provinces above the national production-per-capita average.
  const surplusCountSeries = yearValues.sort((a, b) => a - b).map((statYear) => {
    const stats = statsPerYear.get(statYear)!;
    const values = [...stats.perCapita.values()].map((row) => row.padiPerCapita).filter((value): value is number => value !== null);
    if (!values.length) return { year: statYear, value: null as number | null };
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { year: statYear, value: values.filter((value) => value > average).length };
  });

  const kpis = [
    kpiCell('padi-per-capita', 'Produksi Padi per Kapita', 'ton/jiwa', padiPerSeries.findLast((entry) => entry.value !== null)?.value ?? null, padiPerSeries.findLast((entry) => entry.value !== null)?.year ?? null, padiPerSeries),
    kpiCell('beras-per-capita', 'Produksi Beras per Kapita', 'ton/jiwa', berasPerSeries.findLast((entry) => entry.value !== null)?.value ?? null, berasPerSeries.findLast((entry) => entry.value !== null)?.year ?? null, berasPerSeries),
    kpiCell('productivity', 'Produktivitas Pangan', 'ton/ha', productivitySeries.findLast((entry) => entry.value !== null)?.value ?? null, productivitySeries.findLast((entry) => entry.value !== null)?.year ?? null, productivitySeries),
    kpiCell('surplus', 'Provinsi Surplus Padi', 'provinsi', surplusCountSeries.findLast((entry) => entry.value !== null)?.value ?? null, surplusCountSeries.findLast((entry) => entry.value !== null)?.year ?? null, surplusCountSeries),
  ];

  const chartStats = statsPerYear.get(chartYear);
  const provinceRows: PanganView['provinceRows'] = chartStats
    ? [...chartStats.perCapita.values()].sort((a, b) => (b.padiTon ?? -Infinity) - (a.padiTon ?? -Infinity))
    : [];
  const productivityRows: PanganView['productivityRows'] = chartStats
    ? chartStats.productivity.map((row) => ({ name: row.name, productivity: row.value })).sort((a, b) => b.productivity - a.productivity)
    : [];

  return {
    mode,
    year,
    yearLabel: mode === 'all' ? 'Semua tahun' : String(year),
    chartYear,
    options,
    lastUpdated: DATA_UPDATED_AT_LABEL,
    kpis: pinKpisToYear(kpis, year),
    provinceRows,
    productivityRows,
    totalsByYear,
    trends: [
      { label: 'Produksi Padi per Kapita', unit: 'ton/jiwa', points: padiPerSeries },
      { label: 'Produksi Beras per Kapita', unit: 'ton/jiwa', points: berasPerSeries },
      { label: 'Produktivitas Pangan', unit: 'ton/ha', points: productivitySeries },
    ],
  };
}
