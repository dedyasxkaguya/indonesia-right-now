'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Clock3, LoaderCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { fetchResponseSchema } from '@/lib/api/schemas';
import { storage } from '@/lib/storage';
import type { FetchData } from '@/lib/types/api';
import { formatNumber, formatPercent } from '@/lib/utils/format';

const messages: Record<string, string> = {
  FETCH_SSRF_BLOCKED: 'URL mengarah ke alamat privat/lokal — tidak diizinkan.',
  FETCH_AI_GUARD_BLOCKED: 'Konten halaman terindikasi mengandung prompt-injection. Analisis dibatalkan.',
  FETCH_AI_EXTRACTOR_FAILED: 'AI tidak menemukan item berita yang dapat diekstrak.',
  FETCH_TIMEOUT: 'Halaman memakan waktu terlalu lama. Coba URL lain atau ulangi.',
  FETCH_FORBIDDEN: 'Halaman menolak permintaan analisis.',
  FETCH_NO_CONTENT: 'Tidak ada konten yang dapat dianalisis dari URL tersebut.',
  FETCH_NETWORK: 'Sambungan ke halaman gagal. Coba URL lain atau ulangi.',
  FETCH_ROBOTS_DISALLOWED: 'Sumber tidak mengizinkan pengambilan konten.',
  FETCH_INVALID_URL: 'URL tidak valid atau tidak dapat dianalisis.',
  BACKEND_OFFLINE: 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.',
  UPSTREAM_SCHEMA_MISMATCH: 'Format data dari server tidak sesuai.',
  UPSTREAM_TIMEOUT: 'Server memerlukan waktu terlalu lama untuk merespons.',
  VALIDATION_ERROR: 'Input tidak valid.',
};

const elapsedMarks = [
  { seconds: 0, label: 'Permintaan dikirim' },
  { seconds: 4, label: 'Menunggu halaman diproses' },
  { seconds: 10, label: 'Menunggu hasil ekstraksi' },
  { seconds: 15, label: 'Analisis masih berjalan' },
];

function isHttpUrl(value: string | null): value is string {
  return value !== null && (value.startsWith('http://') || value.startsWith('https://'));
}

function PipelineReport({ data }: { data: FetchData }) {
  const ai = data.ai;
  const yieldPct = ai.items_raw === 0 ? 0 : (ai.items_kept / ai.items_raw) * 100;
  return <section aria-labelledby="pipeline-title" className="border border-paper-300 bg-paper-50 p-5 sm:p-6">
    <h2 className="font-sans text-h3 text-ink-900" id="pipeline-title">Laporan pipeline</h2>
    <dl className="mt-5 divide-y divide-paper-300 border-y border-paper-300">
      <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-ink-500">Guard</dt><dd><Badge variant={ai.guard_status === 'pass' ? 'success' : ai.guard_status === 'blocked' ? 'danger' : 'ochre'}>{ai.guard_status}</Badge></dd></div>
      <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-ink-500">Keyakinan guard</dt><dd className="font-mono text-sm text-ink-900">{formatPercent(ai.guard_confidence * 100)}</dd></div>
      <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-ink-500">Chunk berhasil</dt><dd className="font-mono text-sm text-ink-900">{formatNumber(ai.chunks_ok)} / {formatNumber(ai.chunks_total)}</dd></div>
      <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-ink-500">Item dipertahankan</dt><dd className="font-mono text-sm text-ink-900">{formatNumber(ai.items_kept)} / {formatNumber(ai.items_raw)}</dd></div>
      <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-ink-500">Item dideduplikasi</dt><dd className="font-mono text-sm text-ink-900">{formatNumber(ai.deduped)}</dd></div>
      <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-ink-500">Hasil kurasi</dt><dd className="font-mono text-sm text-ink-900">{formatPercent(yieldPct)}</dd></div>
      <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-ink-500">Cache</dt><dd className="font-mono text-xs text-ink-900">{ai.cached ? 'digunakan' : 'tidak digunakan'}</dd></div>
    </dl>
    <p className="mt-4 break-all font-mono text-[10px] leading-5 text-ink-500">Model · {ai.model}</p>
  </section>;
}

function ResultView({ data, onReset, onRead, autoSave, onAutoSaveChange }: { data: FetchData; onReset: () => void; onRead: (url: string, title: string) => void; autoSave: boolean; onAutoSaveChange: (enabled: boolean) => void }) {
  return <section className="mt-10" aria-label="Hasil analisis URL">
    <div className="mb-6 flex flex-col justify-between gap-4 border-y border-paper-300 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">URL akhir · HTTP {data.http_status} · {Math.round(data.duration_ms)} ms</p>
        {isHttpUrl(data.final_url) ? <a className="mt-1 block break-all font-mono text-xs text-ink-700 underline decoration-paper-300 underline-offset-2 hover:text-brand-red" href={data.final_url} rel="noreferrer" target="_blank">{data.final_url}<span className="sr-only"> (buka URL di tab baru)</span></a> : <p className="mt-1 break-all font-mono text-xs text-ink-700">{data.final_url}</p>}
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-ink-700"><input checked={autoSave} className="size-4 accent-[#D32F2F]" onChange={(event) => onAutoSaveChange(event.target.checked)} type="checkbox" />Simpan otomatis ke Notebook</label>
      <Button className="shrink-0 self-start sm:self-auto" onClick={onReset} variant="secondary"><RotateCcw aria-hidden="true" className="size-4" /> Analisis URL lain</Button>
    </div>
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div className="lg:col-span-4"><PipelineReport data={data} /></div>
      <div className="min-w-0 lg:col-span-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3"><h2 className="font-sans text-h3 text-ink-900">Item berita yang diekstrak</h2><span className="font-mono text-[10px] text-ink-500">{formatNumber(data.news_items.length)} item</span></div>
        {data.news_items.length ? <ol className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {data.news_items.map((item) => {
            const itemUrl = item.url;
            return <li className="border-t border-paper-300 py-4" key={item.id}>
            <div className="mb-2 flex flex-wrap gap-1.5">{item.badges.map((badge) => <Badge key={badge} variant={badge === 'BREAKING' || badge === 'LIVE' ? 'red' : badge === 'SHORTS' ? 'ochre' : 'neutral'}>{badge}</Badge>)}</div>
              {isHttpUrl(itemUrl) ? <div className="flex items-start justify-between gap-2"><button className="text-left font-sans text-sm font-semibold leading-6 text-ink-900 underline decoration-transparent underline-offset-4 hover:text-brand-red hover:decoration-brand-red" onClick={() => onRead(itemUrl, item.title)} type="button">{item.title}</button><a aria-label={`Buka sumber: ${item.title}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-btn text-ink-400 hover:bg-paper-200 hover:text-brand-red" href={itemUrl} rel="noreferrer" target="_blank"><ArrowUpRight aria-hidden="true" className="size-4" /></a></div> : <h3 className="font-sans text-sm font-semibold leading-6 text-ink-900">{item.title}</h3>}
            {item.snippet ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink-500">{item.snippet}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-ink-400">{item.source_name ? <span>{item.source_name}</span> : null}{item.published_text ? <span>{item.published_text}</span> : null}{item.duration_text ? <span>{item.duration_text}</span> : null}{item.views_text ? <span>{item.views_text}</span> : null}</div>
          </li>;
        })}
        </ol> : <StateCard variant="empty" title="Tidak ada item berita yang diekstrak" description="Backend tidak mengembalikan item untuk URL ini." />}
      </div>
    </div>
  </section>;
}

export function UrlForm({ initialUrl = '' }: { initialUrl?: string }) {
  const { openReader } = useDrawer();
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<FetchData | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveReady, setAutoSaveReady] = useState(false);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    setAutoSave(storage.local.get<boolean>('notebookAutoSave:v1') ?? true);
    setAutoSaveReady(true);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [loading]);

  const submit = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setLoading(true);
    setElapsedSeconds(0);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const payload: unknown = await response.json();
      const parsed = fetchResponseSchema.safeParse(payload);
      if (!parsed.success) {
        setError({ code: 'UPSTREAM_SCHEMA_MISMATCH', message: messages.UPSTREAM_SCHEMA_MISMATCH });
        return;
      }
      if (!response.ok || !parsed.data.ok || !parsed.data.data) {
        const code = parsed.data.error?.code ?? 'BACKEND_OFFLINE';
        setError({ code, message: messages[code] ?? 'Analisis belum dapat diselesaikan. Silakan coba kembali.' });
        return;
      }
      setResult(parsed.data.data);
      try { sessionStorage.setItem('irn:lastFetch:v1', JSON.stringify(parsed.data.data)); } catch { /* Session persistence is optional. */ }
      if (autoSave) {
        try {
          const recordId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${parsed.data.data.url}`;
          await storage.dexie.notebook.save({ id: recordId, url: parsed.data.data.url, title: parsed.data.data.title, analyzedAt: Date.now(), result: parsed.data.data });
        } catch { /* A successful analysis stays visible if local persistence fails. */ }
      }
    } catch {
      setError({ code: 'BACKEND_OFFLINE', message: messages.BACKEND_OFFLINE });
    } finally {
      setLoading(false);
    }
  }, [autoSave, url]);

  useEffect(() => {
    if (initialUrl && autoSaveReady && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submit();
    }
  }, [autoSaveReady, initialUrl, submit]);

  return <div>
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <section className="lg:col-span-6">
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500" htmlFor="analysis-url">URL halaman publik</label>
          <input autoComplete="url" className="min-h-14 w-full border-2 border-paper-300 bg-paper-50 px-4 font-mono text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20" id="analysis-url" maxLength={2048} onChange={(event) => setUrl(event.target.value)} placeholder="https://contoh.id/berita" required type="url" value={url} />
          <Button className="w-full sm:w-auto" disabled={loading} type="submit">{loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ArrowUpRight aria-hidden="true" className="size-4" />}{loading ? 'Menganalisis' : 'Analisis URL'}</Button>
          <p className="border-l-2 border-brand-red pl-4 text-xs leading-5 text-ink-500">URL privat atau lokal ditolak oleh proteksi SSRF. Jangan kirim URL yang berisi kredensial atau data privat.</p>
        </form>
      </section>
      <section aria-label="Tahapan analisis" className="border-l border-paper-300 pl-6 lg:col-span-5 lg:col-start-8 lg:pl-8">
        <h2 className="font-sans text-h3 text-ink-900">Laporan pengambilan</h2>
        <ol className="mt-5 space-y-4">{[
          'Ambil halaman publik', 'Periksa guard konten', 'Ekstrak item berita', 'Deduplicasi dan validasi',
        ].map((label, index) => <li className="flex items-center gap-3 font-mono text-xs text-ink-700" key={label}><span className="text-brand-red">{String(index + 1).padStart(2, '0')} →</span>{label}</li>)}</ol>
        <p className="mt-5 text-xs leading-5 text-ink-500">Setiap permintaan melewati backend; halaman dapat memerlukan waktu hingga satu menit.</p>
      </section>
    </div>

    {loading ? <section aria-live="polite" className="mt-10 border-y border-paper-300 py-6" aria-label="Permintaan sedang diproses">
      <div className="flex items-center gap-3"><Clock3 aria-hidden="true" className="size-4 text-brand-red" /><h2 className="font-sans text-base font-semibold text-ink-900">Permintaan sedang berjalan</h2><span className="font-mono text-xs text-ink-500">{elapsedSeconds}s</span></div>
      <p className="mt-2 text-xs text-ink-500">Penanda waktu tidak menunjukkan progres internal backend.</p>
      <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{elapsedMarks.map((mark) => {
        const passed = elapsedSeconds >= mark.seconds;
        return <li className={`flex items-start gap-2 border-t pt-3 ${passed ? 'border-brand-red text-ink-900' : 'border-paper-300 text-ink-400'}`} key={mark.seconds}><span className="mt-0.5 inline-flex size-4 items-center justify-center">{passed ? <Check aria-hidden="true" className="size-3 text-brand-red" /> : <span className="size-1.5 rounded-full bg-paper-400" />}</span><span className="font-mono text-[10px] leading-4"><span className="block">{mark.seconds}s</span>{mark.label}</span></li>;
      })}</ol>
    </section> : null}

    {error ? <div className="mt-8"><StateCard variant="error" title={error.message} description={`Kode: ${error.code}`} action={<Button onClick={() => void submit()} type="button"><RotateCcw aria-hidden="true" className="size-4" /> Coba lagi</Button>} /></div> : null}
    {result ? <ResultView autoSave={autoSave} data={result} onAutoSaveChange={(enabled) => { setAutoSave(enabled); storage.local.set('notebookAutoSave:v1', enabled); }} onRead={(readerUrl, readerTitle) => openReader(readerUrl, undefined, 'lg', readerTitle)} onReset={() => { setResult(null); setUrl(''); setError(null); }} /> : null}
  </div>;
}
