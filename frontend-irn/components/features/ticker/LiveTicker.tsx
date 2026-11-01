import Link from 'next/link';
import type { NewsItem } from '@/lib/types/api';

/**
 * F19 — Live headlines ticker.
 * Server-rendered data, CSS-only marquee (40s), pauses on hover.
 * `prefers-reduced-motion` renders the headlines as a static wrapped list.
 */
export function LiveTicker({ items }: { items: NewsItem[] }) {
  const headlines = items.slice(0, 10);
  if (!headlines.length) return null;

  return (
    <div aria-label="Berita terkini" className="border-b border-paper-300 bg-paper-50" role="region">
      <div className="group mx-auto flex max-w-7xl items-center gap-4 overflow-hidden px-5 py-2.5 lg:px-8">
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-red">Terkini</span>
        <div className="ticker-viewport min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex w-max items-center gap-8 group-hover:[animation-play-state:paused]">
            {headlines.map((item) => (
              <Link
                className="whitespace-nowrap font-mono text-caption text-ink-700 transition-colors hover:text-brand-red"
                href={item.url}
                key={item.id}
                rel="noopener noreferrer"
                target="_blank"
              >
                {item.title} <span className="text-ink-400">· {item.publisher}</span>
              </Link>
            ))}
            <span aria-hidden="true" className="flex items-center gap-8">
              {headlines.map((item) => (
                <span className="whitespace-nowrap font-mono text-caption text-ink-700" key={`dup-${item.id}`}>
                  {item.title} <span className="text-ink-400">· {item.publisher}</span>
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
