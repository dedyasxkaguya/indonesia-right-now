'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { MetricDefinition, Region } from '@/lib/data/schemas';
import { getIgsLabel, getIgsUnit } from '@/lib/igs-labels';

type GovSearchProps = { regions: Region[]; metrics: MetricDefinition[] };

export function GovSearch({ regions, metrics }: GovSearchProps) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get('q') ?? '');
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim().toLocaleLowerCase('id')), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const matches = useMemo(() => {
    if (!debounced) return { regions: [], metrics: [] };
    const regionMatches = regions.filter((region) => (
      region.nama_daerah.toLocaleLowerCase('id').includes(debounced)
      || region.kode_wilayah.toLocaleLowerCase('id').includes(debounced)
    )).slice(0, 12);
    const metricMatches = metrics.filter((metric) => (
      metric.label.toLocaleLowerCase('id').includes(debounced)
      || metric.id.replaceAll('_', ' ').includes(debounced)
      || metric.unit.toLocaleLowerCase('id').includes(debounced)
    )).slice(0, 8);
    return { regions: regionMatches, metrics: metricMatches };
  }, [debounced, metrics, regions]);

  return (
    <section>
      <label htmlFor="gov-search" className="font-mono text-xs uppercase tracking-wider text-ink-500">Cari wilayah atau metrik</label>
      <input
        id="gov-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nama wilayah, kode, atau indikator…"
        className="mt-2 min-h-12 w-full border border-paper-300 bg-paper-50 px-4 text-sm text-ink-900 outline-none focus:border-gov-primary focus:ring-2 focus:ring-gov-primary/20"
      />
      {debounced ? (
        <p className="mt-3 font-mono text-xs text-ink-500">{matches.regions.length + matches.metrics.length} hasil cocok</p>
      ) : null}
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-500">Wilayah</h2>
          {matches.regions.map((region) => {
            const isProvince = region.tingkat_pemerintahan.toLowerCase().includes('provinsi');
            return <Link key={region.kode_wilayah} href={`/gov/${isProvince ? 'provinsi' : 'kabkota'}/${encodeURIComponent(region.kode_wilayah)}`} className="flex items-center justify-between border-t border-paper-300 py-3 text-sm hover:text-gov-primary">
              <span>{region.nama_daerah}</span><span className="font-mono text-xs text-ink-400">{region.kode_wilayah}</span>
            </Link>;
          })}
          {debounced && matches.regions.length === 0 ? <p className="py-3 text-sm text-ink-500">Tidak ada wilayah yang cocok.</p> : null}
        </div>
        <div>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-500">Metrik</h2>
          {matches.metrics.map((metric) => <Link key={metric.id} href={`/gov/analytics?metrik=${metric.id}`} className="block border-t border-paper-300 py-3 hover:text-gov-primary">
            <span className="block text-sm">{getIgsLabel(metric.id)}</span><span className="font-mono text-xs text-ink-400">{getIgsUnit(metric.unit)}</span>
          </Link>)}
          {debounced && matches.metrics.length === 0 ? <p className="py-3 text-sm text-ink-500">Tidak ada metrik yang cocok.</p> : null}
        </div>
      </div>
    </section>
  );
}
