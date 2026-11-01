import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function SurfaceCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('border border-paper-300 bg-paper-50 p-6', className)} {...props} />;
}
