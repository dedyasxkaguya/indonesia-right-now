'use client';

import Link from 'next/link';
import common from '@/content/common.json';
import type { Mode } from '@/lib/mode';

export function ModeToggle({ mode, collapsed = false, onNavigate }: { mode: Mode; collapsed?: boolean; onNavigate?: () => void }) {
  const isIgs = mode === 'igs';
  const activeClasses = isIgs
    ? 'bg-gov-primary text-paper-50 shadow-sm'
    : 'bg-brand-red text-paper-50 shadow-sm';
  return (
    <div className={collapsed ? 'text-center' : ''}>
      {!collapsed && (
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{common.mode.label}</p>
      )}
      <div
        role="group"
        aria-label={common.mode.switchLabel}
        className={`inline-flex h-10 rounded-full border border-paper-300 bg-paper-100 p-1 ${collapsed ? '' : 'w-full'}`}
      >
        <Link
          href="/"
          aria-current={!isIgs ? 'page' : undefined}
          onClick={onNavigate}
          className={`inline-flex min-w-10 flex-1 items-center justify-center rounded-full px-3 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red ${
            !isIgs ? activeClasses : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          IRN
        </Link>
        <Link
          href="/gov"
          aria-current={isIgs ? 'page' : undefined}
          onClick={onNavigate}
          className={`inline-flex min-w-10 flex-1 items-center justify-center rounded-full px-3 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary ${
            isIgs ? activeClasses : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          IGS
        </Link>
      </div>
      {!collapsed && (
        <p className="mt-2 font-mono text-[10px] text-ink-500">{common.mode.active}: {mode.toUpperCase()}</p>
      )}
    </div>
  );
}
