'use client';

import { useRouter } from 'next/navigation';

export type AnalyticsTimeRange = '12h' | '24h' | '72h';

const OPTIONS: AnalyticsTimeRange[] = ['12h', '24h', '72h'];

export function TimeRangeToggle({ current }: { current: AnalyticsTimeRange }) {
  const router = useRouter();

  return (
    <div aria-label="Rentang waktu analitik" className="inline-flex gap-1 rounded-pill border border-paper-300 bg-paper-50 p-1" role="group">
      {OPTIONS.map((option) => (
        <button
          aria-pressed={current === option}
          className={`rounded-pill px-3 py-1 text-caption transition-colors ${
            current === option ? 'bg-brand-red text-paper-50' : 'text-ink-500 hover:text-ink-900'
          }`}
          key={option}
          onClick={() => router.push(`/analitik?since=${option}`, { scroll: false })}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
