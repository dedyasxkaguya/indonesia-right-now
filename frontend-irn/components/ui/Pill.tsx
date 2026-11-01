import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean };

export function Pill({ selected = false, className, ...props }: PillProps) {
  return <button className={cn('inline-flex min-h-11 items-center justify-center rounded-pill border px-3 py-1.5 font-mono text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2', selected ? 'border-brand-red bg-brand-red text-paper-50' : 'border-paper-300 bg-paper-50 text-ink-700 hover:bg-paper-200', className)} aria-pressed={selected} {...props} />;
}
