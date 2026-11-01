'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const buttonStyles = cva('inline-flex items-center justify-center gap-2 font-sans text-sm font-semibold transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      primary: 'rounded-btn bg-brand-red px-5 py-3 text-paper-50 hover:bg-brand-redDeep',
      secondary: 'rounded-btn border border-paper-300 bg-paper-50 px-5 py-3 text-ink-900 hover:bg-paper-200',
      ghost: 'rounded-btn px-3 py-2 text-ink-700 hover:bg-paper-200',
    },
    size: { sm: 'min-h-11', md: 'min-h-11', lg: 'min-h-14 px-6 text-base' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
