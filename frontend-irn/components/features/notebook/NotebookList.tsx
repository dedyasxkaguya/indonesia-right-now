'use client';

import Fuse from 'fuse.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Download, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { NotebookDetailDrawer } from '@/components/features/notebook/NotebookDetailDrawer';
import { NotebookQuota } from '@/components/features/notebook/NotebookQuota';
import { useStorageReady } from '@/components/layout/StorageProvider';
import { storage } from '@/lib/storage';
import type { NotebookAnalysisRecord } from '@/lib/types/storage';

const changeEvent = 'irn:notebook-change';
type SortMode = 'recent' | 'title' | 'items';

function downloadText(name: string, text: string, type: string) {
  const href = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a'); anchor.href = href; anchor.download = name; anchor.click(); URL.revokeObjectURL(href);
}

export function NotebookList() {
  const ready = useStorageReady();
  const router = useRouter();
  const [records, setRecords] = useState<NotebookAnalysisRecord[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [selected, setSelected] = useState<NotebookAnalysisRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [diff, setDiff] = useState<{ id: string; added: number; removed: number } | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const refresh = useCallback(async () => { if (ready) setRecords(await storage.dexie.notebook.list().catch(() => [])); }, [ready]);

  useEffect(() => { void refresh(); window.addEventListener(changeEvent, refresh); const channel = 'BroadcastChannel' in window ? new BroadcastChannel('irn:notebook') : null; if (channel) channel.onmessage = () => void refresh(); return () => { window.removeEventListener(changeEvent, refresh); channel?.close(); }; }, [refresh]);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query), 200); return () => window.clearTimeout(timer); }, [query]);
  const fuse = useMemo(() => new Fuse(records, { keys: [{ name: 'title', weight: 2 }, { name: 'url', weight: 1 }], threshold: 0.4, ignoreLocation: true }), [records]);
  const visible = useMemo(() => {
    const found = debouncedQuery.trim() ? fuse.search(debouncedQuery).map((result) => result.item) : [...records];
    return found.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'id') : sort === 'items' ? b.result.news_items.length - a.result.news_items.length || b.analyzedAt - a.analyzedAt : b.analyzedAt - a.analyzedAt);
  }, [debouncedQuery, fuse, records, sort]);

  async function reanalyze(record: NotebookAnalysisRecord) {
    setBusy(true);
    try {
      const response = await fetch('/api/fetch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: record.url, mode: 'text', include_raw: false }) });
      const raw: unknown = await response.json();
      const { fetchResponseSchema } = await import('@/lib/api/schemas');
      const parsed = fetchResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error('Format data dari server tidak sesuai.');
      if (!response.ok || !parsed.data.ok || !parsed.data.data) throw new Error(parsed.data.error?.message ?? 'Hasil analisis tidak valid.');
      const nextResult = parsed.data.data;
      const previousIds = new Set(record.result.news_items.map((item) => item.id));
      const nextIds = new Set(nextResult.news_items.map((item) => item.id));
      const added = [...nextIds].filter((id) => !previousIds.has(id)).length;
      const removed = [...previousIds].filter((id) => !nextIds.has(id)).length;
      const next = { ...record, title: nextResult.title || record.title, analyzedAt: Date.now(), result: nextResult };
      await storage.dexie.notebook.save(next);
      setDiff({ id: record.id, added, removed });
      if (selected?.id === record.id) setSelected(next);
      toast.success(`${added} item baru, ${removed} hilang.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Analisis ulang gagal.'); }
    finally { setBusy(false); }
  }

  async function remove(record: NotebookAnalysisRecord) {
    if (!window.confirm(`Hapus analisis ${record.title || record.url}?`)) return;
    await storage.dexie.notebook.delete(record.id);
    if (selected?.id === record.id) setSelected(null);
  }

  const exportRecord = (record: NotebookAnalysisRecord) => downloadText(`analisis_${record.id}.json`, JSON.stringify(record, null, 2), 'application/json;charset=utf-8');
  const exportAll = async () => downloadText('notebook.jsonl', await storage.dexie.notebook.exportJSONL(), 'application/x-ndjson;charset=utf-8');
  const sizeBytes = new TextEncoder().encode(JSON.stringify(records)).length;
  const sizeMb = sizeBytes / 1024 / 1024;
  const atRisk = records.length > 40 || sizeMb > 40;

  if (!ready) return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="loading" title="Membuka notebook" description="Membaca analisis tersimpan di perangkat ini." /></div>;
  return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
    <header className="mb-8 flex flex-col justify-between gap-4 border-b border-paper-300 pb-7 sm:flex-row sm:items-end"><div><p className="font-mono text-eyebrow uppercase text-brand-red">Riset · 11</p><h1 className="mt-3 font-sans text-h1 text-ink-900">Notebook</h1></div><p className="font-mono text-xs text-ink-500">{records.length} entri tersimpan</p></header>
    {!records.length ? <StateCard variant="empty" title="Belum ada analisis tersimpan. Coba analisis URL dan aktifkan simpan otomatis." action={<Button onClick={() => router.push('/analisis-url')}>Analisis URL <ArrowUpRight aria-hidden="true" className="size-4" /></Button>} /> : <>
      <div className="mb-5 grid grid-cols-1 gap-3 border-b border-paper-300 pb-5 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
        <label><span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Cari notebook</span><input className="min-h-11 w-full border border-paper-300 bg-paper-50 px-3 text-sm text-ink-900 focus:border-brand-red focus:outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Judul atau URL" type="search" value={query} /></label>
        <label><span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Urutkan</span><select className="min-h-11 w-full border border-paper-300 bg-paper-50 px-3 text-sm text-ink-900" onChange={(event) => setSort(event.target.value as SortMode)} value={sort}><option value="recent">Terbaru dianalisis</option><option value="title">Judul A–Z</option><option value="items">Jumlah item terbanyak</option></select></label>
        <Button onClick={() => void exportAll()} variant="secondary"><Download aria-hidden="true" className="size-4" /> Ekspor semua (JSONL)</Button>
      </div>
      {atRisk && !warningDismissed ? <div className="mb-5 flex items-start justify-between gap-4 border-l-2 border-brand-ochre bg-paper-50 p-4"><p className="text-xs leading-5 text-ink-700">Pertimbangkan hapus entri lama untuk performa optimal.</p><button aria-label="Tutup peringatan" className="text-xs text-ink-500" onClick={() => setWarningDismissed(true)} type="button">Tutup</button></div> : null}
      {visible.length ? <div className="divide-y divide-paper-300 border-y border-paper-300">{visible.map((record) => <article className="py-5" key={record.id}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><h2 className="font-sans text-h3 text-ink-900">{record.title || new URL(record.url).hostname}</h2><a className="mt-1 inline-block max-w-[60ch] truncate font-mono text-[10px] text-ink-500 underline decoration-transparent hover:text-brand-red hover:decoration-brand-red" href={record.url} rel="noreferrer" target="_blank">{record.url}<ExternalLink aria-hidden="true" className="ml-1 inline size-3" /></a><div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant="ochre">{record.result.news_items.length} item</Badge><Badge variant={record.result.ai.guard_status === 'pass' ? 'success' : 'danger'}>{record.result.ai.guard_status}</Badge><span className="font-mono text-[10px] text-ink-500">{record.result.ai.chunks_ok}/{record.result.ai.chunks_total} chunk · {formatDistanceToNow(record.analyzedAt, { addSuffix: true, locale: id })}</span></div>{diff?.id === record.id ? <p className="mt-2 font-mono text-[10px] text-ink-500">{diff.added} item baru, {diff.removed} hilang</p> : null}</div><div className="flex flex-wrap gap-2"><Button onClick={() => setSelected(record)} variant="secondary">Buka</Button><Button disabled={busy} onClick={() => void reanalyze(record)} variant="ghost"><RefreshCw aria-hidden="true" className={`size-4 ${busy ? 'animate-spin' : ''}`} /> Analisis ulang</Button><Button onClick={() => void remove(record)} variant="ghost"><Trash2 aria-hidden="true" className="size-4" /> Hapus</Button><Button onClick={() => exportRecord(record)} variant="ghost"><Download aria-hidden="true" className="size-4" /><span className="sr-only">Ekspor JSON</span></Button></div></div>
      </article>)}</div> : <StateCard variant="empty" title="Tidak ada hasil pencarian" />}
      <NotebookQuota count={records.length} />
    </>}
    <NotebookDetailDrawer busy={busy} onClose={() => setSelected(null)} onExport={() => selected && exportRecord(selected)} onExportAll={() => void exportAll()} onReanalyze={() => selected && void reanalyze(selected)} record={selected} />
  </div>;
}
