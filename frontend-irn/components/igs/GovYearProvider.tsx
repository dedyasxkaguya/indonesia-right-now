'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import type { GovYear } from '@/lib/data/types';

const years: GovYear[] = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
type GovYearContextValue = { year: GovYear; setYear: (year: GovYear) => void };
const GovYearContext = createContext<GovYearContextValue | null>(null);

export function GovYearProvider({ children }: PropsWithChildren) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryYear = Number(searchParams?.get('tahun'));
  const year = years.includes(queryYear as GovYear) ? queryYear as GovYear : 2025;

  const setYear = useCallback((nextYear: GovYear) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tahun', String(nextYear));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const value = useMemo(() => ({ year, setYear }), [year, setYear]);
  return <GovYearContext.Provider value={value}>{children}</GovYearContext.Provider>;
}

export function useGovYear() {
  const context = useContext(GovYearContext);
  if (!context) throw new Error('useGovYear harus digunakan di dalam GovYearProvider.');
  return context;
}

export function IgsYearSelector({ expanded = false, compact = false }: { expanded?: boolean; compact?: boolean }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const selected = Number(searchParams?.get('tahun'));
  const year = years.includes(selected as GovYear) ? selected as GovYear : 2025;
  const setYear = (nextYear: GovYear) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tahun', String(nextYear));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  return <GovYearStepper year={year} onYearChange={setYear} compact={compact} expanded={expanded} />;
}

export function GovYearStepper({
  year: suppliedYear,
  onYearChange,
  compact = false,
  expanded = false,
}: {
  year?: GovYear;
  onYearChange?: (year: GovYear) => void;
  compact?: boolean;
  expanded?: boolean;
}) {
  const context = useContext(GovYearContext);
  const year = suppliedYear ?? context?.year ?? 2025;
  const setYear = onYearChange ?? context?.setYear;
  const yearIndex = years.indexOf(year);
  const previous = years[yearIndex - 1];
  const next = years[yearIndex + 1];

  return (
    <div
      role="group"
      aria-label="Pilih tahun data"
      className={`inline-flex min-h-11 items-center gap-1 border border-paper-300 bg-paper-50 px-1 ${
        compact ? 'rounded-btn' : expanded ? 'flex-wrap' : ''
      }`}
    >
      <button
        type="button"
        disabled={previous === undefined}
        aria-label={previous === undefined ? 'Tidak ada tahun sebelumnya' : `Tahun sebelumnya: ${previous}`}
        onClick={() => previous !== undefined && setYear?.(previous)}
        className="inline-flex size-9 items-center justify-center font-mono text-lg text-gov-primary transition-colors hover:bg-gov-primarySoft disabled:cursor-not-allowed disabled:text-ink-300"
      >
        ‹
      </button>
      <output aria-live="polite" className="min-w-12 text-center font-mono text-sm font-semibold tabular-nums text-ink-900">
        {year}
      </output>
      <button
        type="button"
        disabled={next === undefined}
        aria-label={next === undefined ? 'Tidak ada tahun berikutnya' : `Tahun berikutnya: ${next}`}
        onClick={() => next !== undefined && setYear?.(next)}
        className="inline-flex size-9 items-center justify-center font-mono text-lg text-gov-primary transition-colors hover:bg-gov-primarySoft disabled:cursor-not-allowed disabled:text-ink-300"
      >
        ›
      </button>
    </div>
  );
}
