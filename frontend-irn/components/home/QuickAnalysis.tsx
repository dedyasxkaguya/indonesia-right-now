'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { fetchResponseSchema } from '@/lib/api/schemas';
import type { FetchData } from '@/lib/types/api';

const messages: Record<string, string> = {
  FETCH_SSRF_BLOCKED: 'URL mengarah ke alamat privat/lokal — tidak diizinkan.',
  FETCH_AI_GUARD_BLOCKED: 'Konten halaman terindikasi mengandung prompt-injection. Analisis dibatalkan.',
  FETCH_AI_EXTRACTOR_FAILED: 'AI tidak menemukan item berita yang dapat diekstrak.',
  FETCH_TIMEOUT: 'Halaman memakan waktu terlalu lama. Coba URL lain atau ulangi.',
  FETCH_FORBIDDEN: 'Halaman menolak permintaan analisis.',
  FETCH_NO_CONTENT: 'Tidak ada konten yang dapat dianalisis dari URL tersebut.',
  BACKEND_OFFLINE: 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.',
};

export function QuickAnalysis() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FetchData | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
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
        setError('Format data dari server tidak sesuai.');
        return;
      }
      if (!response.ok || !parsed.data.ok || !parsed.data.data) {
        const code = parsed.data.error?.code ?? 'BACKEND_OFFLINE';
        setError(messages[code] ?? parsed.data.error?.message ?? 'Analisis belum dapat diselesaikan.');
        return;
      }
      setResult(parsed.data.data);
    } catch {
      setError(messages.BACKEND_OFFLINE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-l border-paper-300 pl-6 lg:col-span-7 lg:pl-10">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
        <label className="sr-only" htmlFor="quick-analysis-url">URL halaman publik</label>
        <input
          autoComplete="url"
          className="min-h-14 min-w-0 flex-1 border-2 border-paper-300 bg-paper-50 px-4 font-mono text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          id="quick-analysis-url"
          maxLength={2048}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://contoh.id/berita"
          required
          type="url"
          value={url}
        />
        <button className="inline-flex min-h-14 items-center justify-center gap-2 bg-brand-red px-5 font-sans text-sm font-semibold text-paper-50 transition-colors hover:bg-brand-redDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60" disabled={busy} type="submit">
          {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="size-4" />}
          {busy ? 'Menganalisis' : 'Analisis'}
        </button>
      </form>
      <p className="mt-3 border-l-2 border-brand-red pl-3 text-caption text-ink-500">URL privat atau lokal ditolak oleh proteksi SSRF. Analisis dapat memerlukan waktu hingga satu menit.</p>
      {error ? <p className="mt-5 border-t border-paper-300 pt-4 text-sm text-data-danger" role="alert">{error}</p> : null}
      {result ? <div className="mt-6 border-t border-paper-300 pt-5" aria-live="polite">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{result.title || result.final_url}</p>
        {result.news_items.length ? <ol className="mt-3 divide-y divide-paper-300">
          {result.news_items.slice(0, 3).map((item) => <li className="py-3" key={item.id}>
            {item.url && (item.url.startsWith('https://') || item.url.startsWith('http://')) ? <a className="font-sans text-sm font-semibold text-ink-900 underline decoration-paper-300 underline-offset-4 hover:text-brand-red" href={item.url} rel="noreferrer" target="_blank">{item.title}</a> : <p className="font-sans text-sm font-semibold text-ink-900">{item.title}</p>}
            {item.source_name ? <p className="mt-1 font-mono text-[11px] text-ink-500">{item.source_name}</p> : null}
          </li>)}
        </ol> : <p className="mt-3 text-sm text-ink-500">Tidak ada item berita yang dapat ditampilkan dari URL ini.</p>}
        <p className="mt-3 font-mono text-[10px] text-ink-400">{result.news_items.length} item · HTTP {result.http_status} · {Math.round(result.duration_ms)} ms</p>
      </div> : null}
    </div>
  );
}
