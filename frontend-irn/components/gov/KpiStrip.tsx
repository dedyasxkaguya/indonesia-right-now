import type { KpiCell } from '@/lib/gov/phase-b-views';

function Sparkline({ series }: { series: KpiCell['series'] }) {
  const points = series.filter((entry) => entry.value !== null);
  if (points.length < 2) {
    return (
      <svg viewBox="0 0 84 20" className="mt-3 h-5 w-full" role="img" aria-label="Tren tidak mencukupi untuk digambar">
        {points.length === 1 ? (
          <circle cx={42} cy={10} r={2.5} fill="#0E4A6F" />
        ) : null}
      </svg>
    );
  }
  const values = points.map((entry) => entry.value as number);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const width = 84;
  const mapped = points.map((entry, index) => {
    const x = points.length > 1 ? (index / (points.length - 1)) * (width - 6) + 3 : width / 2;
    const y = 16 - ((entry.value as number - minimum) / range) * 12;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} 20`} className="mt-3 h-5 w-full" role="img" aria-label={`Ringkasan tren ${points.length} titik data`}>
      <title>Tren ringkas</title>
      <desc>Rangkaian nilai indikator pada tahun-tahun yang memiliki data; tahun tanpa data dilewati, bukan dinolkan.</desc>
      <polyline points={mapped.join(' ')} fill="none" stroke="#0E4A6F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {mapped.map((point) => {
        const [cx, cy] = point.split(',');
        return <circle key={point} cx={cx} cy={cy} r="2" fill="#0E4A6F" />;
      })}
    </svg>
  );
}

export function KpiStrip({ cells }: { cells: KpiCell[] }) {
  return (
    <section aria-label="Ringkasan indikator" className="border border-paper-300 bg-paper-50">
      <div className="grid grid-cols-1 divide-y divide-paper-300 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {cells.map((cell) => (
          <div key={cell.id} className="min-w-0 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{cell.label}</p>
            <p className="mt-2 break-words font-mono text-2xl font-semibold tabular-nums text-gov-primary">
              {cell.value === 'Data belum tersedia' ? <span className="text-sm font-medium text-ink-500">Data belum tersedia</span> : cell.value}
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink-400">
              {cell.value === 'Data belum tersedia' ? '' : cell.unit}
            </p>
            <p className="mt-2 line-clamp-1 overflow-hidden text-ellipsis whitespace-nowrap text-caption text-ink-500" title={cell.caption}>{cell.caption}</p>
            <Sparkline series={cell.series} />
          </div>
        ))}
      </div>
    </section>
  );
}
