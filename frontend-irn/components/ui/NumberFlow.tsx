'use client';

import NumberFlow from '@number-flow/react';
import type { Format } from '@number-flow/react';

type NumberFlowValueProps = { value: number; className?: string; format?: Format };

export function NumberFlowValue({ value, className, format }: NumberFlowValueProps) {
  return <NumberFlow value={value} className={className} locales="id-ID" format={format} />;
}
