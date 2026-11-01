'use client';
import { ArrowUpRight, Menu, Search, Accessibility } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { BookmarkCount } from '@/components/features/BookmarkCount';
import { WatchlistBell } from '@/components/features/watchlist/WatchlistBell';
import { useCommandPalette } from '@/components/layout/CommandPaletteProvider';
import { useSidebar } from '@/components/layout/SidebarProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getModeFromPath } from '@/lib/mode';
import { IgsYearSelector } from '@/components/igs/GovYearProvider';

export function Navbar() {
  const pathname = usePathname() ?? '/';
  const mode = getModeFromPath(pathname);
  const { openPalette } = useCommandPalette();
  const { setMobileOpen, collapsed } = useSidebar();
  const isMobile = useIsMobile();

  const handleA11yClick = () => {
    const button = document.querySelector('button[aria-label="Pengaturan aksesibilitas"]') as HTMLButtonElement | null;
    if (button) {
      button.click();
    }
  };

  return (
    <header className="sticky top-0 z-20 h-[76px] border-b border-paper-300 bg-paper-100/95 backdrop-blur-sm">
      <div className={`mx-auto flex h-full min-w-0 items-center justify-between gap-2 px-3 transition-[margin] duration-200 sm:gap-4 sm:px-6 lg:px-8 ${
        collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
      }`}>
        {/* Left: Mobile hamburger + Wordmark */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Buka navigasi ponsel"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-btn border border-paper-300 text-ink-900 hover:bg-paper-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <Link
            aria-label="indonesia-right-now, beranda"
            className="inline-flex min-h-11 items-center whitespace-nowrap font-sans text-xs font-bold text-ink-900 sm:text-sm"
            href={mode === 'igs' ? '/gov' : '/'}
          >
            <span className="hidden sm:inline">indonesia-</span><span className={mode === 'igs' ? 'text-gov-primary' : 'text-brand-red'}>right</span>-now
          </Link>
        </div>

        {/* Center: Search input trigger (⌘K opens CommandPalette) */}
        {mode === 'igs' ? (
          <div className="shrink-0">
            <Suspense fallback={<div className="h-11 w-24" />}><IgsYearSelector compact /></Suspense>
          </div>
        ) : null}
        {!isMobile && mode === 'irn' ? (
          <div className="flex-1 max-w-md mx-2">
            <button
              type="button"
              onClick={openPalette}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 rounded-btn border border-paper-300 bg-paper-50 text-xs text-ink-500 hover:border-paper-400 hover:bg-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            >
              <span className="flex items-center gap-2 truncate">
                <Search aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
                <span className="truncate">Cari halaman, topik, publisher…</span>
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-paper-300 bg-paper-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">⌘K</kbd>
            </button>
          </div>
        ) : null}

        {/* Right: A11y trigger + Watchlist + Bookmarks + CTA */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={handleA11yClick}
            aria-label="Aksesibilitas"
            title="Aksesibilitas"
            className="hidden sm:inline-flex size-11 items-center justify-center rounded-btn border border-paper-300 text-ink-700 hover:bg-paper-200 hover:text-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
          >
            <Accessibility aria-hidden="true" className="size-4" />
          </button>
          {mode === 'irn' ? <><BookmarkCount /><WatchlistBell /><Link
            className="inline-flex min-h-11 items-center gap-2 rounded-btn bg-brand-red px-3 text-xs font-semibold text-paper-50 transition-colors hover:bg-brand-redDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100 sm:px-4"
            href="/analisis-url"
          >
            <span className="hidden sm:inline">Analisis URL</span><ArrowUpRight aria-hidden="true" className="size-4" />
          </Link></> : <Link className="inline-flex min-h-11 items-center gap-2 rounded-btn bg-gov-primary px-3 text-xs font-semibold text-paper-50 transition-colors hover:bg-gov-primaryDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary focus-visible:ring-offset-2 sm:px-4" href="/gov/pencarian"><span className="hidden sm:inline">Cari data</span><Search aria-hidden="true" className="size-4" /></Link>}
        </div>
      </div>
    </header>
  );
}
