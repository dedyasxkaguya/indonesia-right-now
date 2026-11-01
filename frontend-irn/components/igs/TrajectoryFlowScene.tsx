'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { IdleOrbitControls } from './IdleOrbitControls';
import { useGovYear } from './GovYearProvider';
import { useSceneFallback, useScenePageActive } from './useSceneRuntime';
import type { DatasetRow } from '@/lib/data/schemas';
import { formatValue } from '@/lib/data/format';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { StateCard } from '@/components/ui/StateCard';

const axisKeys = [
  '_derived_fiscal_autonomy',
  '_derived_welfare_composite',
  '_derived_economic_resilience',
] as const;

type TrajectoryPoint = {
  year: number;
  x: number;
  y: number;
  z: number;
  color: string;
  fiscal: number;
  welfare: number;
  resilience: number;
};

type ProvinceTrajectory = {
  code: string;
  name: string;
  segments: TrajectoryPoint[][];
  selected: TrajectoryPoint | null;
};

function readNumber(row: DatasetRow, key: string) {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function colorFor(value: number, min: number, max: number) {
  const amount = max === min ? 0.5 : THREE.MathUtils.clamp((value - min) / (max - min), 0, 1);
  const low = new THREE.Color('#0E4A6F');
  const middle = new THREE.Color('#0891B2');
  const high = new THREE.Color('#B45309');
  return (amount <= 0.5 ? low.lerp(middle, amount * 2) : middle.lerp(high, (amount - 0.5) * 2)).getStyle();
}

function normalized(value: number, min: number, max: number) {
  return max === min ? 0.5 : (value - min) / (max - min);
}

function PointMarkers({
  trajectories,
  onHover,
  onNavigate,
}: {
  trajectories: ProvinceTrajectory[];
  onHover: (trajectory: ProvinceTrajectory | null) => void;
  onNavigate: (code: string) => void;
}) {
  return <group>
    {trajectories.map((trajectory) => <group key={trajectory.code}>
      {trajectory.segments.filter((segment) => segment.length > 1).map((segment, index) => <Line
        key={`${trajectory.code}-segment-${index}`}
        points={segment.map((point) => new THREE.Vector3(point.x, point.y, point.z))}
        color={segment[segment.length - 1].color}
        lineWidth={1}
        transparent
        opacity={0.28}
      />)}
      {trajectory.selected ? <mesh
        position={[trajectory.selected.x, trajectory.selected.y, trajectory.selected.z]}
        onClick={(event) => { event.stopPropagation(); onNavigate(trajectory.code); }}
        onPointerOver={(event) => { event.stopPropagation(); onHover(trajectory); }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[0.075, 18, 18]} />
        <meshBasicMaterial color={trajectory.selected.color} />
      </mesh> : null}
    </group>)}
  </group>;
}

function TrajectoryTable({ rows }: { rows: DatasetRow[] }) {
  const sorted = [...rows].sort((a, b) => String(a.nama_daerah).localeCompare(String(b.nama_daerah), 'id') || Number(a.tahun_anggaran) - Number(b.tahun_anggaran));
  return <details className="mt-3 border-t border-paper-200 pt-3">
    <summary className="cursor-pointer font-mono text-[11px] text-ink-500">Lihat jejak indikator sebagai tabel ({sorted.length} baris wilayah-tahun)</summary>
    <div className="mt-3 max-h-64 overflow-auto">
      <table className="w-full min-w-max text-left text-xs">
        <thead><tr className="border-b border-paper-300"><th className="py-2 pr-4">Provinsi</th><th className="py-2 pr-4">Tahun</th><th className="py-2 pr-4">Kemandirian fiskal</th><th className="py-2 pr-4">Kesejahteraan</th><th className="py-2">Ketahanan ekonomi</th></tr></thead>
        <tbody>{sorted.map((row, index) => <tr key={`${String(row.kode_wilayah)}-${String(row.tahun_anggaran)}-${index}`} className="border-b border-paper-200">
          <td className="py-1.5 pr-4"><Link className="text-gov-primary hover:underline" href={`/gov/provinsi/${encodeURIComponent(String(row.kode_wilayah))}`}>{String(row.nama_daerah)}</Link></td>
          <td className="py-1.5 pr-4 font-mono">{String(row.tahun_anggaran)}</td>
          {axisKeys.map((key) => {
            const value = readNumber(row, key);
            return <td key={key} className="py-1.5 pr-4 font-mono">{value === null ? 'Data tidak tersedia' : formatValue(value, 2)}</td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-ink-500">Tabel membantu membandingkan nilai tiga indikator dari tahun ke tahun; wilayah dengan data yang tidak lengkap tidak membentuk lintasan.</p>
  </details>;
}

function StaticTrajectory({ trajectories, year }: { trajectories: ProvinceTrajectory[]; year: number }) {
  const id = useId().replaceAll(':', '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const x = (point: TrajectoryPoint) => 42 + ((point.x + 3) / 6) * 556;
  const y = (point: TrajectoryPoint) => 320 - ((point.y + 3) / 6) * 270;

  return <svg role="img" aria-labelledby={`${titleId} ${descriptionId}`} aria-label={`Lintasan provinsi pada tahun ${year}`} viewBox="0 0 640 360" className="h-auto w-full">
    <title id={titleId}>Lintasan indikator provinsi</title>
    <desc id={descriptionId}>Jejak dua dimensi kemandirian fiskal dan kesejahteraan, dengan marker pada tahun terpilih. Garis hanya menghubungkan tahun dengan tiga nilai lengkap.</desc>
    {[0, 1, 2, 3, 4, 5].map((tick) => <line key={`grid-${tick}`} x1="42" x2="598" y1={50 + tick * 54} y2={50 + tick * 54} stroke="#D9D2C4" strokeDasharray="3 4" />)}
    <line x1="42" x2="42" y1="45" y2="320" stroke="#847F75" />
    <line x1="42" x2="598" y1="320" y2="320" stroke="#847F75" />
    <text x="42" y="345" fill="#625E57" fontSize="11">Kemandirian fiskal · skala relatif</text>
    <text x="46" y="35" fill="#625E57" fontSize="11">Kesejahteraan · indeks relatif</text>
    {trajectories.map((trajectory) => <g key={trajectory.code}>
      {trajectory.segments.map((segment, index) => <polyline key={`${trajectory.code}-static-${index}`} points={segment.map((point) => `${x(point)},${y(point)}`).join(' ')} fill="none" stroke={segment[segment.length - 1].color} strokeOpacity=".35" strokeWidth="1.5" />)}
      {trajectory.selected ? <Link href={`/gov/provinsi/${encodeURIComponent(trajectory.code)}`}>
        <circle cx={x(trajectory.selected)} cy={y(trajectory.selected)} r="5" fill={trajectory.selected.color} stroke="#FDFBF6" strokeWidth="1.5">
          <title>{`${trajectory.name} · ${year}: fiskal ${formatValue(trajectory.selected.fiscal, 2)}, kesejahteraan ${formatValue(trajectory.selected.welfare, 2)}, ketahanan ${formatValue(trajectory.selected.resilience, 2)}`}</title>
        </circle>
      </Link> : null}
    </g>)}
  </svg>;
}

export function TrajectoryFlowScene({ rows }: { rows: DatasetRow[] }) {
  const id = useId().replaceAll(':', '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const { year } = useGovYear();
  const router = useRouter();
  const staticScene = useSceneFallback();
  const active = useScenePageActive();
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const yearlyData = useMemo(() => {
    const values = axisKeys.map((key) => rows.map((row) => readNumber(row, key)).filter((value): value is number => value !== null));
    return values.map((metricValues) => ({
      min: metricValues.length ? Math.min(...metricValues) : 0,
      max: metricValues.length ? Math.max(...metricValues) : 1,
    }));
  }, [rows]);
  const trajectories = useMemo(() => {
    const grouped = new Map<string, DatasetRow[]>();
    rows.forEach((row) => {
      const code = String(row.kode_wilayah);
      grouped.set(code, [...(grouped.get(code) ?? []), row]);
    });
    const welfareRange = yearlyData[1];
    return [...grouped].map(([code, regionRows]) => {
      const ordered = [...regionRows].sort((a, b) => Number(a.tahun_anggaran) - Number(b.tahun_anggaran));
      const segments: TrajectoryPoint[][] = [];
      let segment: TrajectoryPoint[] = [];
      let selected: TrajectoryPoint | null = null;
      let name = String(ordered[0]?.nama_daerah ?? code);
      let previousYear: number | null = null;
      for (const row of ordered) {
        const fiscal = readNumber(row, axisKeys[0]);
        const welfare = readNumber(row, axisKeys[1]);
        const resilience = readNumber(row, axisKeys[2]);
        const targetYear = Number(row.tahun_anggaran);
        if (fiscal === null || welfare === null || resilience === null) {
          if (segment.length) segments.push(segment);
          segment = [];
          previousYear = null;
          continue;
        }
        if (previousYear !== null && targetYear !== previousYear + 1 && segment.length) {
          segments.push(segment);
          segment = [];
        }
        const point: TrajectoryPoint = {
          year: targetYear,
          x: (normalized(fiscal, yearlyData[0].min, yearlyData[0].max) - 0.5) * 6,
          y: (normalized(welfare, yearlyData[1].min, yearlyData[1].max) - 0.5) * 6,
          z: (normalized(resilience, yearlyData[2].min, yearlyData[2].max) - 0.5) * 6,
          color: colorFor(welfare, welfareRange.min, welfareRange.max),
          fiscal,
          welfare,
          resilience,
        };
        segment.push(point);
        if (targetYear === year) {
          selected = point;
          name = String(row.nama_daerah ?? name);
        }
        previousYear = targetYear;
      }
      if (segment.length) segments.push(segment);
      return { code, name, segments, selected };
    }).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [rows, year, yearlyData]);
  const hovered = trajectories.find((trajectory) => trajectory.code === hoveredCode) ?? null;
  const description = 'Lintasan 2020–2025 memetakan kemandirian fiskal, kesejahteraan, dan ketahanan ekonomi. Garis menghubungkan tahun berurutan yang memiliki ketiga indikator; marker mengikuti tahun terpilih.';

  if (staticScene === null) return <StateCard variant="loading" title="Memuat lintasan tiga dimensi" description="Menyiapkan data dan preferensi perangkat." />;

  return <SurfaceCard>
    <h2 id={titleId} className="font-sans text-h3 text-ink-900">Lintasan perubahan indikator provinsi</h2>
    <p id={descriptionId} className="mt-1 max-w-3xl text-caption text-ink-500">{description}</p>
    <div role="img" aria-labelledby={`${titleId} ${descriptionId}`} aria-label={`${description} Tahun saat ini: ${year}.`} className="relative mt-3 overflow-hidden border border-paper-200 bg-paper-50">
      {staticScene
        ? <StaticTrajectory trajectories={trajectories} year={year} />
        : <div className="h-[45dvh] min-h-[260px] max-h-[50dvh] w-full sm:h-[380px] sm:max-h-none">
          <Canvas camera={{ position: [8, 7, 9], fov: 42 }} dpr={[1, 1.75]} frameloop={active ? 'always' : 'never'} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
            <IdleOrbitControls />
            <gridHelper args={[8, 8, '#B8B1A5', '#E4DED3']} position={[0, -3.1, 0]} />
            <Line points={[new THREE.Vector3(-3.2, -3.1, 0), new THREE.Vector3(3.2, -3.1, 0)]} color="#847F75" lineWidth={1} />
            <Line points={[new THREE.Vector3(-3.2, -3.1, -3.1), new THREE.Vector3(-3.2, 3.1, -3.1)]} color="#847F75" lineWidth={1} />
            <PointMarkers
              trajectories={trajectories}
              onHover={(trajectory) => setHoveredCode(trajectory?.code ?? null)}
              onNavigate={(code) => router.push(`/gov/provinsi/${encodeURIComponent(code)}`)}
            />
          </Canvas>
        </div>}
      {hovered?.selected ? <div role="tooltip" className="absolute left-3 top-3 border border-paper-300 bg-paper-50/95 px-3 py-2 text-xs shadow-sm">
        <p className="font-semibold text-ink-900">{hovered.name} · {year}</p>
        <p className="font-mono text-ink-500">Fiskal {formatValue(hovered.selected.fiscal, 2)} · Kesejahteraan {formatValue(hovered.selected.welfare, 2)} · Ketahanan {formatValue(hovered.selected.resilience, 2)}</p>
      </div> : null}
    </div>
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-ink-500">
      <span>Sumbu X · Kemandirian fiskal</span><span>Sumbu Y · Komposit kesejahteraan</span><span>Sumbu Z · Ketahanan ekonomi</span><span>Warna · Kesejahteraan ({year})</span>
    </div>
    <TrajectoryTable rows={rows} />
  </SurfaceCard>;
}
