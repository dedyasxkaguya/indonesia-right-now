"use client";

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function YearSelectorClient({
  options,
  defaultKey,
}: {
  options: { key: string; label: string }[];
  defaultKey: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedKey = searchParams?.get('year') ?? defaultKey;
  const selectedOption = options.find((option) => option.key === selectedKey) ?? options[0];
  const allYearsOption = options.find((option) => option.key === 'all');
  const yearSequence = [
    ...(allYearsOption ? [allYearsOption] : []),
    ...options.filter((option) => option.key !== 'all').sort((a, b) => Number(a.key) - Number(b.key)),
  ];
  const selectedIndex = yearSequence.findIndex((option) => option.key === selectedOption?.key);
  const previous = yearSequence[selectedIndex - 1];
  const next = yearSequence[selectedIndex + 1];

  const selectYear = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('year', value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div aria-label="Pilih tahun data" className="inline-flex min-h-11 items-center gap-2 border border-paper-300 bg-paper-50 px-2">
      <button type="button" disabled={!previous} aria-label={previous ? `Tahun sebelumnya: ${previous.label}` : 'Tidak ada tahun sebelumnya'} onClick={() => previous && selectYear(previous.key)} className="inline-flex size-8 items-center justify-center font-mono text-lg text-gov-primary transition-colors hover:bg-gov-primarySoft disabled:cursor-not-allowed disabled:text-ink-300">‹</button>
      <output aria-live="polite" className="min-w-20 text-center font-mono text-sm font-semibold tabular-nums text-ink-900">{selectedOption?.label ?? 'Data belum tersedia'}</output>
      <button type="button" disabled={!next} aria-label={next ? `Tahun berikutnya: ${next.label}` : 'Tidak ada tahun berikutnya'} onClick={() => next && selectYear(next.key)} className="inline-flex size-8 items-center justify-center font-mono text-lg text-gov-primary transition-colors hover:bg-gov-primarySoft disabled:cursor-not-allowed disabled:text-ink-300">›</button>
    </div>
  );
}
