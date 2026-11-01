'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
}

export function NotebookQuota({ count }: { count: number }) {
  const [usage, setUsage] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!navigator.storage?.estimate) return;
    void navigator.storage.estimate().then((estimate) => { if (mounted) setUsage(estimate.usage ?? 0); }).catch(() => undefined);
    return () => { mounted = false; };
  }, [count]);
  const usageMb = (usage ?? 0) / (1024 * 1024);
  const warning = count > 40 || usageMb > 40;
  return <div className="mt-8 border-t border-paper-300 pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-xs text-ink-500">{count} entri · {usage === null ? 'ukuran tidak tersedia' : `${formatBytes(usage)} dari ~50 MB`}</p>{warning ? <Badge variant="ochre">Penyimpanan hampir penuh</Badge> : null}</div>
    {warning ? <p className="mt-2 text-xs text-ink-500">Pertimbangkan hapus entri lama untuk performa optimal.</p> : null}
  </div>;
}
