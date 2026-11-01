'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { IdleOrbitControls } from './IdleOrbitControls';
import { GovYearStepper, useGovYear } from './GovYearProvider';
import { useSceneFallback, useScenePageActive } from './useSceneRuntime';
import type { DatasetRow, Region } from '@/lib/data/schemas';
import type { GeoCollection, GeoFeature } from '@/lib/data/geo-types';
import { formatValue } from '@/lib/data/format';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { StateCard } from '@/components/ui/StateCard';

const metricChoices = [
  { key: '_derived_composite_development_score', label: 'Indeks pembangunan gabungan', unit: 'indeks relatif' },
  { key: 'indeks_pembangunan_manusia_ipm', label: 'Indeks pembangunan manusia', unit: 'poin' },
  { key: '_derived_fiscal_autonomy', label: 'Kemandirian fiskal', unit: '%' },
] as const;
type MetricKey = (typeof metricChoices)[number]['key'];
type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };
type Bubble = {
  code: string;
  name: string;
  value: number | null;
  normalized: number | null;
  color: string;
  x: number;
  z: number;
  longitude: number;
  latitude: number;
};

function ringsFor(feature: GeoFeature): number[][][] {
  const { geometry } = feature;
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

function boundsFor(features: GeoFeature[]): Bounds {
  const positions = features.flatMap((feature) => ringsFor(feature).flat());
  const longitudes = positions.map((position) => position[0]).filter(Number.isFinite);
  const latitudes = positions.map((position) => position[1]).filter(Number.isFinite);
  return {
    minLon: Math.min(...longitudes),
    maxLon: Math.max(...longitudes),
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
  };
}

function ringCentroid(ring: number[][]) {
  let twiceArea = 0;
  let xTotal = 0;
  let yTotal = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    xTotal += (current[0] + next[0]) * cross;
    yTotal += (current[1] + next[1]) * cross;
  }
  if (Math.abs(twiceArea) < 1e-10) {
    const positions = ring.slice(0, -1);
    if (!positions.length) return null;
    return {
      longitude: positions.reduce((sum, point) => sum + point[0], 0) / positions.length,
      latitude: positions.reduce((sum, point) => sum + point[1], 0) / positions.length,
      area: 0,
    };
  }
  return { longitude: xTotal / (3 * twiceArea), latitude: yTotal / (3 * twiceArea), area: Math.abs(twiceArea) / 2 };
}

function featureCentroid(feature: GeoFeature) {
  const { geometry } = feature;
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];
  const parts = polygons.map((polygon) => polygon[0] ? ringCentroid(polygon[0]) : null).filter((part): part is NonNullable<typeof part> => part !== null);
  if (!parts.length) return null;
  const areaSum = parts.reduce((sum, part) => sum + part.area, 0);
  if (areaSum === 0) return { longitude: parts.reduce((sum, part) => sum + part.longitude, 0) / parts.length, latitude: parts.reduce((sum, part) => sum + part.latitude, 0) / parts.length };
  return {
    longitude: parts.reduce((sum, part) => sum + part.longitude * part.area, 0) / areaSum,
    latitude: parts.reduce((sum, part) => sum + part.latitude * part.area, 0) / areaSum,
  };
}

function boundaryPointCloud(features: GeoFeature[], target = 10_000) {
  const segments: { start: number[]; end: number[]; length: number }[] = [];
  let totalLength = 0;
  features.forEach((feature) => ringsFor(feature).forEach((ring) => {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const start = ring[index];
      const end = ring[index + 1];
      const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
      if (length <= 0) continue;
      segments.push({ start, end, length });
      totalLength += length;
    }
  }));
  const spacing = totalLength / target;
  return segments.flatMap(({ start, end, length }) => {
    const steps = Math.max(1, Math.round(length / spacing));
    return Array.from({ length: steps }, (_, index) => {
      const fraction = index / steps;
      return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction] as [number, number];
    });
  });
}

function metricValue(row: DatasetRow | undefined, key: string) {
  const value = row?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metricColor(value: number | null, minimum: number, maximum: number) {
  if (value === null) return '#B8B1A5';
  const amount = maximum === minimum ? 0.5 : THREE.MathUtils.clamp((value - minimum) / (maximum - minimum), 0, 1);
  const low = new THREE.Color('#0E4A6F');
  const middle = new THREE.Color('#0891B2');
  const high = new THREE.Color('#B45309');
  return (amount <= 0.5 ? low.lerp(middle, amount * 2) : middle.lerp(high, (amount - 0.5) * 2)).getStyle();
}

function sceneCoordinates(longitude: number, latitude: number, bounds: Bounds) {
  const longitudeSpan = Math.max(1e-6, bounds.maxLon - bounds.minLon);
  const latitudeSpan = Math.max(1e-6, bounds.maxLat - bounds.minLat);
  return {
    x: ((longitude - bounds.minLon) / longitudeSpan - 0.5) * 12,
    z: (0.5 - (latitude - bounds.minLat) / latitudeSpan) * 5,
  };
}

function ScenePointCloud({ positions }: { positions: Float32Array }) {
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return nextGeometry;
  }, [positions]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry} frustumCulled={false}>
    <pointsMaterial color="#D9D2C4" size={0.018} sizeAttenuation transparent opacity={0.78} depthWrite={false} />
  </points>;
}

function ProvinceBubbles({
  bubbles,
  onHover,
  onNavigate,
}: {
  bubbles: Bubble[];
  onHover: (bubble: Bubble | null) => void;
  onNavigate: (code: string) => void;
}) {
  return <group>
    {bubbles.map((bubble) => {
      const height = bubble.normalized === null ? 0.08 : 0.08 + bubble.normalized * 1.4;
      return <mesh
        key={bubble.code}
        position={[bubble.x, height, bubble.z]}
        onClick={(event) => { event.stopPropagation(); onNavigate(bubble.code); }}
        onPointerOver={(event) => { event.stopPropagation(); onHover(bubble); }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[0.075 + (bubble.normalized ?? 0) * 0.045, 20, 20]} />
        <meshBasicMaterial color={bubble.color} />
      </mesh>;
    })}
  </group>;
}

function SceneTimelineControls({ reducedMotion, active }: { reducedMotion: boolean; active: boolean }) {
  const { year, setYear } = useGovYear();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || reducedMotion || !active) return undefined;
    const interval = window.setInterval(() => {
      const next = (year === 2026 ? 2020 : year + 1) as (typeof year);
      setYear(next);
    }, 1400);
    return () => window.clearInterval(interval);
  }, [active, playing, reducedMotion, setYear, year]);

  return <div className="mt-4 border-t border-paper-200 pt-3">
    <div className="flex items-center justify-between gap-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">Lintasan waktu</p>
      <button type="button" onClick={() => setPlaying((current) => !current)} aria-pressed={playing} disabled={reducedMotion} className="min-h-11 border border-paper-300 px-3 font-mono text-[10px] font-semibold text-gov-primary enabled:hover:border-gov-primary disabled:cursor-not-allowed disabled:opacity-50">
        {reducedMotion ? 'Putar otomatis nonaktif' : playing ? 'Jeda' : 'Putar otomatis'}
      </button>
    </div>
    <div className="mt-2"><GovYearStepper /></div>
  </div>;
}

function ProvinceTable({ rows, regions, metric, year, geometryCodes }: {
  rows: DatasetRow[];
  regions: Region[];
  metric: (typeof metricChoices)[number];
  year: number;
  geometryCodes: Set<string>;
}) {
  const data = regions
    .filter((region) => region.tingkat_pemerintahan === 'Provinsi')
    .map((region) => ({
      ...region,
      value: metricValue(rows.find((row) => row.kode_wilayah === region.kode_wilayah && row.tahun_anggaran === year), metric.key),
      hasGeometry: geometryCodes.has(region.kode_wilayah),
    }))
    .sort((a, b) => a.nama_daerah.localeCompare(b.nama_daerah, 'id'));
  return <details className="mt-3 border-t border-paper-200 pt-3">
    <summary className="cursor-pointer font-mono text-[11px] text-ink-500">Lihat data sebagai tabel ({data.length} provinsi; geometri tersedia untuk {geometryCodes.size})</summary>
    <div className="mt-3 max-h-64 overflow-auto">
      <table className="w-full min-w-max text-left text-xs">
        <thead><tr className="border-b border-paper-300"><th className="py-2 pr-4">Provinsi</th><th className="py-2 pr-4">Kode</th><th className="py-2 pr-4">{metric.label} · {year}</th><th className="py-2">Geometri</th></tr></thead>
        <tbody>{data.map((row) => <tr key={row.kode_wilayah} className="border-b border-paper-200">
          <td className="py-1.5 pr-4"><Link className="text-gov-primary hover:underline" href={`/gov/provinsi/${encodeURIComponent(row.kode_wilayah)}`}>{row.nama_daerah}</Link></td>
          <td className="py-1.5 pr-4 font-mono">{row.kode_wilayah}</td>
          <td className="py-1.5 pr-4 font-mono">{row.value === null ? 'Data tidak tersedia' : `${formatValue(row.value, 2)} ${metric.unit}`}</td>
          <td className="py-1.5">{row.hasGeometry ? 'Tersedia' : 'Tidak tersedia'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-ink-500">Tabel merangkum nilai indikator dan ketersediaan geometri untuk setiap provinsi pada tahun terpilih.</p>
  </details>;
}

function StaticArchipelago({ bubbles, bounds, onHover, metric, year }: {
  bubbles: Bubble[];
  bounds: Bounds;
  onHover: (bubble: Bubble | null) => void;
  metric: (typeof metricChoices)[number];
  year: number;
}) {
  const id = useId().replaceAll(':', '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const px = (longitude: number) => 12 + ((longitude - bounds.minLon) / Math.max(1e-6, bounds.maxLon - bounds.minLon)) * 616;
  const py = (latitude: number) => 12 + (1 - (latitude - bounds.minLat) / Math.max(1e-6, bounds.maxLat - bounds.minLat)) * 236;

  return <svg role="img" aria-labelledby={`${titleId} ${descriptionId}`} aria-label={`Peta statis provinsi untuk ${metric.label} tahun ${year}`} viewBox="0 0 640 260" className="mt-3 h-auto w-full">
    <title id={titleId}>Kepulauan Indonesia · scene statis</title>
    <desc id={descriptionId}>34 bubble provinsi dari sentroid geometri tersedia. Warna dan tinggi dalam visual tiga dimensi mengikuti nilai metrik terpilih.</desc>
    {bubbles.map((bubble) => <Link key={bubble.code} href={`/gov/provinsi/${encodeURIComponent(bubble.code)}`} onMouseEnter={() => onHover(bubble)} onMouseLeave={() => onHover(null)}>
      <circle cx={px(bubble.longitude)} cy={py(bubble.latitude)} r={4 + (bubble.normalized ?? 0) * 3} fill={bubble.color} stroke="#FDFBF6" strokeWidth="1.5">
        <title>{`${bubble.name}: ${bubble.value === null ? 'Data tidak tersedia' : `${formatValue(bubble.value, 2)} ${metric.unit}`}`}</title>
      </circle>
    </Link>)}
  </svg>;
}

export function TemporalArchipelagoScene({
  rows,
  regions,
  className,
}: {
  rows: DatasetRow[];
  regions: Region[];
  className?: string;
}) {
  const id = useId().replaceAll(':', '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const { year } = useGovYear();
  const router = useRouter();
  const [metricKey, setMetricKey] = useState<MetricKey>(metricChoices[0].key);
  const [geo, setGeo] = useState<GeoCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Bubble | null>(null);
  const staticScene = useSceneFallback();
  const active = useScenePageActive();
  const metric = metricChoices.find((choice) => choice.key === metricKey) ?? metricChoices[0];

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/gov-geo/provinces', { signal: controller.signal });
        if (!response.ok) throw new Error(`Layanan geometri merespons ${response.status}.`);
        const result = await response.json() as GeoCollection;
        if (result.type !== 'FeatureCollection' || !Array.isArray(result.features) || !result.features.length) {
          throw new Error('Berkas batas provinsi memiliki struktur yang tidak valid.');
        }
        setGeo(result);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Geometri provinsi tidak dapat dimuat.');
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const features = useMemo(() => geo?.features ?? [], [geo]);
  const bounds = useMemo(() => features.length ? boundsFor(features) : { minLon: 0, maxLon: 1, minLat: 0, maxLat: 1 }, [features]);
  const pointCloud = useMemo(() => boundaryPointCloud(features), [features]);
  const cloudPositions = useMemo(() => {
    const positions = new Float32Array(pointCloud.length * 3);
    pointCloud.forEach(([longitude, latitude], index) => {
      const projected = sceneCoordinates(longitude, latitude, bounds);
      positions[index * 3] = projected.x;
      positions[index * 3 + 1] = -0.02;
      positions[index * 3 + 2] = projected.z;
    });
    return positions;
  }, [bounds, pointCloud]);
  const currentRows = new Map(rows.filter((row) => row.tahun_anggaran === year).map((row) => [String(row.kode_wilayah), row]));
  const metricValues = rows.map((row) => metricValue(row, metric.key)).filter((value): value is number => value !== null);
  const minimum = metricValues.length ? Math.min(...metricValues) : 0;
  const maximum = metricValues.length ? Math.max(...metricValues) : 1;
  const bubbles = features.flatMap((feature) => {
    const centroid = featureCentroid(feature);
    if (!centroid) return [];
    const code = String(feature.properties.kode_wilayah ?? '');
    const row = currentRows.get(code);
    const value = metricValue(row, metric.key);
    const normalized = value === null ? null : maximum === minimum ? 0.5 : THREE.MathUtils.clamp((value - minimum) / (maximum - minimum), 0, 1);
    const projected = sceneCoordinates(centroid.longitude, centroid.latitude, bounds);
    return [{
      code,
      name: String(row?.nama_daerah ?? feature.properties.nama_daerah ?? code),
      value,
      normalized,
      color: metricColor(value, minimum, maximum),
      x: projected.x,
      z: projected.z,
      longitude: centroid.longitude,
      latitude: centroid.latitude,
    }];
  });
  const geometryCodes = new Set(bubbles.map((bubble) => bubble.code));
  const visibleMin = metricValues.length ? formatValue(minimum, 2) : 'Data tidak tersedia';
  const visibleMax = metricValues.length ? formatValue(maximum, 2) : 'Data tidak tersedia';
  const description = `Awan titik disampel secara interpolasi dari batas GeoJSON; ${bubbles.length} bubble provinsi diposisikan pada sentroid geometri dan tingginya mengikuti ${metric.label}. Tahun ${year}.`;
  const onMetricChange = (event: ChangeEvent<HTMLSelectElement>) => setMetricKey(event.currentTarget.value as MetricKey);

  const dataTable = <ProvinceTable rows={rows} regions={regions} metric={metric} year={year} geometryCodes={geometryCodes} />;

  if (error) return <SurfaceCard className={className}>
    <h2 id={titleId} className="font-sans text-h3 text-ink-900">Kepulauan temporal Indonesia</h2>
    <StateCard variant="error" title="Scene tidak dapat dimuat" description={error} />
    {dataTable}
  </SurfaceCard>;
  if (!geo || staticScene === null) return <StateCard variant="loading" title="Memuat scene kepulauan" description="Menyiapkan geometri lokal dan preferensi perangkat." className={className} />;

  return <SurfaceCard className={className}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id={titleId} className="font-sans text-h3 text-ink-900">Kepulauan temporal Indonesia</h2>
        <p id={descriptionId} className="mt-1 max-w-3xl text-caption text-ink-500">{description}</p>
      </div>
      <label className="flex flex-col gap-1 font-mono text-[10px] text-ink-500">METRIK
        <select value={metricKey} onChange={onMetricChange} className="min-h-9 border border-paper-300 bg-paper-50 px-2 font-sans text-xs text-ink-900">
          {metricChoices.map((choice) => <option key={choice.key} value={choice.key}>{choice.label}</option>)}
        </select>
      </label>
    </div>
    <div role="img" aria-labelledby={`${titleId} ${descriptionId}`} aria-label={`${description} Rentang warna: ${visibleMin} sampai ${visibleMax}.`} className="relative mt-3 overflow-hidden border border-paper-200 bg-paper-50">
      {staticScene
        ? <StaticArchipelago bubbles={bubbles} bounds={bounds} onHover={setHovered} metric={metric} year={year} />
        : <div className="h-[45dvh] min-h-[260px] max-h-[50dvh] w-full sm:h-[380px] sm:max-h-none">
          <Canvas camera={{ position: [0, 9.5, 11], fov: 42 }} dpr={[1, 1.75]} frameloop={active ? 'always' : 'never'} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
            <IdleOrbitControls />
            <ScenePointCloud positions={cloudPositions} />
            <ProvinceBubbles bubbles={bubbles} onHover={setHovered} onNavigate={(code) => router.push(`/gov/provinsi/${encodeURIComponent(code)}`)} />
          </Canvas>
        </div>}
      {hovered ? <div role="tooltip" className="absolute left-3 top-3 border border-paper-300 bg-paper-50/95 px-3 py-2 text-xs shadow-sm">
        <p className="font-semibold text-ink-900">{hovered.name}</p>
        <p className="font-mono text-ink-500">{metric.label}: {hovered.value === null ? 'Data tidak tersedia' : `${formatValue(hovered.value, 2)} ${metric.unit}`}</p>
        <p className="font-mono text-[10px] text-ink-400">Tahun {year} · kode {hovered.code}</p>
      </div> : null}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-500">
      <span>Warna: <span className="font-mono">gov.primary → gov.cyan → brand.ochre</span>; rentang tetap dihitung dari tahun yang tersedia.</span>
      <span className="font-mono">Titik batas diinterpolasi · {pointCloud.length.toLocaleString('id-ID')} sampel</span>
    </div>
    <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-500">
      <span>{visibleMin}</span><span className="h-2 flex-1 bg-gradient-to-r from-[#0E4A6F] via-[#0891B2] to-[#B45309]" aria-hidden="true" /><span>{visibleMax} {metric.unit}</span>
    </div>
    <SceneTimelineControls reducedMotion={staticScene} active={active} />
    {dataTable}
  </SurfaceCard>;
}
