import { cn } from '@/lib/utils/cn';

type SectionHeaderProps = { index: string; title: string; className?: string };

export function SectionHeader({ index, title, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-8 flex items-baseline gap-4', className)}>
      <span className="font-mono text-sm text-brand-red">{index}</span>
      <span aria-hidden="true" className="h-px w-8 bg-paper-300" />
      <h2 className="font-sans text-h2 text-ink-900">{title}</h2>
    </div>
  );
}
