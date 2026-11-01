'use client';

import { Drawer as VaulDrawer } from 'vaul';
import { ArrowUpRight, Download, Files, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { NotebookAnalysisRecord } from '@/lib/types/storage';

type NotebookDetailDrawerProps = { record: NotebookAnalysisRecord | null; onClose: () => void; onReanalyze: () => void; onExport: () => void; onExportAll: () => void; busy: boolean };

export function NotebookDetailDrawer({ record, onClose, onReanalyze, onExport, onExportAll, busy }: NotebookDetailDrawerProps) {
  return <VaulDrawer.Root direction="right" modal open={record !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <VaulDrawer.Portal><VaulDrawer.Overlay className="fixed inset-0 z-[70] bg-ink-900/35" /><VaulDrawer.Content className="fixed inset-y-0 right-0 z-[71] flex h-full w-[min(48rem,100vw)] flex-col border-l border-paper-300 bg-paper-100 shadow-xl focus:outline-none">
      <VaulDrawer.Title className="sr-only">Detail notebook</VaulDrawer.Title><VaulDrawer.Description className="sr-only">Hasil analisis URL yang tersimpan di perangkat.</VaulDrawer.Description>
      {record ? <>
        <header className="flex items-start justify-between gap-4 border-b border-paper-300 px-5 py-4 sm:px-7"><div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Dianalisis · {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(record.analyzedAt)}</p><h2 className="mt-1 truncate font-sans text-lg font-semibold text-ink-900">{record.title || record.url}</h2><p className="mt-1 truncate font-mono text-[10px] text-ink-500">{record.url}</p></div><button aria-label="Tutup detail" className="inline-flex size-9 items-center justify-center rounded-btn text-ink-500 hover:bg-paper-200" onClick={onClose} type="button"><X aria-hidden="true" className="size-4" /></button></header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border-y border-paper-300 py-3"><p className="font-mono text-[10px] text-ink-500">Status guard</p><p className="mt-2"><Badge variant={record.result.ai.guard_status === 'pass' ? 'success' : 'danger'}>{record.result.ai.guard_status}</Badge></p></div>
          <div className="border-y border-paper-300 py-3"><p className="font-mono text-[10px] text-ink-500">Chunk</p><p className="mt-2 font-mono text-sm text-ink-900">{record.result.ai.chunks_ok}/{record.result.ai.chunks_total}</p></div>
          <div className="border-y border-paper-300 py-3"><p className="font-mono text-[10px] text-ink-500">Item</p><p className="mt-2 font-mono text-sm text-ink-900">{record.result.ai.items_kept}/{record.result.ai.items_raw}</p></div>
          <div className="border-y border-paper-300 py-3"><p className="font-mono text-[10px] text-ink-500">HTTP</p><p className="mt-2 font-mono text-sm text-ink-900">{record.result.http_status}</p></div>
        </div><ol className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2">{record.result.news_items.map((item) => <li className="border-t border-paper-300 py-4" key={item.id}><h3 className="font-sans text-sm font-semibold leading-6 text-ink-900">{item.title}</h3>{item.snippet ? <p className="mt-2 text-xs leading-5 text-ink-500">{item.snippet}</p> : null}<p className="mt-2 font-mono text-[10px] text-ink-400">{item.source_name ?? 'Sumber tidak tersedia'} · {item.published_text ?? 'Waktu tidak tersedia'}</p></li>)}</ol></div>
        <footer className="flex flex-wrap items-center gap-2 border-t border-paper-300 bg-paper-50 px-5 py-3 sm:px-7"><Button disabled={busy} onClick={onReanalyze} variant="secondary"><RefreshCw aria-hidden="true" className="size-4" />Analisis ulang</Button><Button onClick={onExport} variant="ghost"><Download aria-hidden="true" className="size-4" />Ekspor JSON</Button><Button onClick={onExportAll} variant="ghost"><Files aria-hidden="true" className="size-4" />Ekspor semua (JSONL)</Button><a className="ml-auto inline-flex size-9 items-center justify-center rounded-btn text-ink-500 hover:bg-paper-200" href={record.url} rel="noreferrer" target="_blank" aria-label="Buka URL asli"><ArrowUpRight aria-hidden="true" className="size-4" /></a></footer>
      </> : null}
    </VaulDrawer.Content></VaulDrawer.Portal>
  </VaulDrawer.Root>;
}
