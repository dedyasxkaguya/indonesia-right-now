'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { fetchNewsClient } from '@/lib/api/client';
import { EXPLAIN_REGISTRY, type ExplainComputeContext } from '@/lib/explain/registry';
import type { NewsData, NewsResponse } from '@/lib/types/api';
import useSWR from 'swr';

type ExplainPanelProps = { id: string; context?: ExplainComputeContext; onClose: () => void };

export function ExplainPanel({ id, context, onClose }: ExplainPanelProps) {
  const config = EXPLAIN_REGISTRY[id];
  const { data: response, error, isLoading } = useSWR<NewsResponse, Error>(config ? '/api/news?since=24h&max_items=200' : null, fetchNewsClient, { revalidateOnFocus: false, shouldRetryOnError: false });
  const data = response?.data ?? null;
  const current = useMemo(() => data && config ? config.compute(data, context) : null, [config, context, data]);
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => { setShareUrl(window.location.href); }, [id]);

  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('Tautan penjelasan disalin.'); } catch { toast.error('Tautan tidak dapat disalin.'); }
  }

  return <div className="flex h-full min-h-0 flex-col bg-paper-100">
    <header className="flex items-start justify-between gap-4 border-b border-paper-300 px-5 py-5 sm:px-7">
      <div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-red">Metodologi</p><h2 className="mt-1 font-sans text-h3 text-ink-900">{config?.title ?? 'Metrik tidak dikenal'}</h2><p className="mt-2 text-sm leading-6 text-ink-500">{config?.oneLiner ?? 'Metrik ini tidak terdaftar dalam registry.'}</p></div>
      <button aria-label="Tutup penjelasan" className="inline-flex size-9 shrink-0 items-center justify-center rounded-btn text-ink-500 hover:bg-paper-200" onClick={onClose} type="button"><X aria-hidden="true" className="size-4" /></button>
    </header>
    <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-7">
      {config ? <>
        <section><h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Rumus</h3><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-card bg-paper-200 p-4 font-mono text-caption text-ink-700">{config.formula}</pre></section>
        <section><h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Nilai saat ini</h3>{isLoading ? <p className="mt-3 font-mono text-xl text-ink-400">Memuat...</p> : error || !data ? <p className="mt-3 text-sm text-ink-500">Data belum tersedia.</p> : <p className="mt-3 font-mono text-4xl font-semibold leading-none text-ink-900">{current?.value ?? 'Belum tersedia'}</p>}</section>
        <section><h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Langkah hitung</h3>{current?.steps.length ? <ol className="mt-2 divide-y divide-paper-300 border-y border-paper-300">{current.steps.map((step) => <li className="flex items-start justify-between gap-4 py-3 text-sm" key={`${step.label}:${step.value}`}><span className="text-ink-500">{step.label}</span><span className="text-right font-mono text-xs text-ink-900">{step.value}</span></li>)}</ol> : <p className="mt-2 text-sm text-ink-500">Langkah tidak tersedia tanpa data yang cukup.</p>}</section>
        <section><h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Field sumber</h3><ul className="mt-2 space-y-1">{config.sourceFields.map((field) => <li className="break-all font-mono text-[11px] leading-5 text-ink-700" key={field}>{field}</li>)}</ul></section>
        <section><h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Batasan</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-500">{config.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul></section>
        <p className="font-mono text-[10px] text-brand-red">{config.transformerFile}</p>
      </> : <StateCard variant="empty" title="Penjelasan tidak tersedia" description="ID metrik tidak ditemukan dalam registry." />}
    </div>
    <footer className="flex items-center justify-between border-t border-paper-300 bg-paper-50 px-5 py-3 sm:px-7">
      <span className="truncate font-mono text-[10px] text-ink-400">{shareUrl}</span>
      <Button className="ml-3 shrink-0" onClick={() => void share()} variant="ghost"><Copy aria-hidden="true" className="size-4" /><span className="sr-only">Salin tautan</span></Button>
    </footer>
  </div>;
}
