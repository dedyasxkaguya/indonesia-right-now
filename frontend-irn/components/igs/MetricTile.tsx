import { SurfaceCard } from '@/components/ui/SurfaceCard';

export function MetricTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <SurfaceCard className="min-h-32 p-4 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className="mt-3 break-words font-mono text-xl font-semibold leading-tight text-gov-primary sm:text-2xl">{value}</p>
      <p className="mt-2 h-5 overflow-hidden text-ellipsis whitespace-nowrap text-caption text-ink-500" title={caption}>{caption}</p>
    </SurfaceCard>
  );
}
