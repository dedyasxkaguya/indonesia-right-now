'use client';

import { GovYearStepper } from './GovYearProvider';

export function YearSlider() {
  return (
    <div className="border-b border-paper-300 bg-paper-50/90 px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">Tahun data</p>
        <GovYearStepper />
      </div>
    </div>
  );
}
