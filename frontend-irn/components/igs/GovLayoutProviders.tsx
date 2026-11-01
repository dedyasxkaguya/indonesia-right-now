import { Suspense } from 'react';
import type { PropsWithChildren } from 'react';
import { GovYearProvider } from './GovYearProvider';
import { YearSlider } from './YearSlider';

export function GovLayoutProviders({ children }: PropsWithChildren) {
  return <Suspense fallback={<div className="min-h-12" />}><GovYearProvider><YearSlider />{children}</GovYearProvider></Suspense>;
}
