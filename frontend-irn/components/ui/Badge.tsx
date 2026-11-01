import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const badgeStyles = cva('inline-flex items-center border px-2 py-1 font-mono text-[11px] leading-none', {
  variants: {
    variant: {
      neutral: 'border-paper-300 bg-paper-100 text-ink-700',
      red: 'border-brand-red/30 bg-data-pink text-brand-redDeep',
      ochre: 'border-brand-ochre/30 bg-amber-50 text-brand-ochre',
      success: 'border-data-success/25 bg-green-50 text-data-success',
      danger: 'border-data-danger/25 bg-red-50 text-data-danger',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeStyles>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />;
}
