import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type StateCardProps = {
  variant: 'empty' | 'error' | 'loading';
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
};

const icons = { empty: Inbox, error: AlertCircle, loading: LoaderCircle };

export function StateCard({ variant, title, description, className, action, children }: StateCardProps) {
  const Icon = icons[variant];
  const resolvedAction = action ?? children;
  return (
    <div className={cn('flex min-h-40 flex-col items-start justify-center border border-dashed border-paper-300 bg-paper-50 p-6', className)} role={variant === 'error' ? 'alert' : undefined}>
      <Icon aria-hidden="true" className={cn('mb-3 size-5 text-brand-red', variant === 'loading' && 'animate-spin')} />
      <h2 className="font-sans text-h3 text-ink-900">{title}</h2>
      {description ? <p className="mt-2 max-w-prose text-body text-ink-500">{description}</p> : null}
      {resolvedAction ? <div className="mt-4">{resolvedAction}</div> : null}
    </div>
  );
}
