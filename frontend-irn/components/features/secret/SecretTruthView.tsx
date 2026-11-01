'use client';

import useSWR from 'swr';
import { ArrowUpRight } from 'lucide-react';
import { GrungeShell } from '@/components/features/secret/GrungeShell';
import { fetchNewsClient } from '@/lib/api/client';
import { computeCrossSourceEcho } from '@/lib/transformers';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import type { NewsResponse } from '@/lib/types/api';
import type { SecretCase } from '@/lib/types/secret';

function buildCases(response: NewsResponse | undefined): SecretCase[] {
  const data = response?.data;
  if (!data) return [];
  const byId = new Map(data.items.map((item) => [item.id, item]));
  const echo = computeCrossSourceEcho(data.items);
  const cases: SecretCase[] = [];
  const used = new Set<string>();

  for (const cluster of echo.echoes) {
    const lead = cluster.itemIds.map((id) => byId.get(id)).find((item) => item !== undefined);
    if (!lead) continue;
    used.add(lead.id);
    cases.push({
      id: `echo:${lead.id}`,
      kind: 'echo',
      headline: lead.title,
      summary: lead.summary !== null && lead.summary.trim().length > 0 ? lead.summary : null,
      publisher: lead.publisher,
      publishedAt: lead.published_at,
      sourceUrl: lead.url,
      relatedPublishers: cluster.publishers,
      relatedCount: cluster.itemIds.length,
      dateConfidence: lead.date_confidence,
    });
    if (cases.length >= 6) break;
  }

  const uncertain = data.items
    .filter((item) => item.date_confidence !== 'exact' && !used.has(item.id))
    .sort((first, second) => {
      const firstTime = Date.parse(first.published_at);
      const secondTime = Date.parse(second.published_at);
      if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && firstTime !== secondTime) return secondTime - firstTime;
      return first.id.localeCompare(second.id);
    })
    .slice(0, 6);

  for (const item of uncertain) {
    cases.push({
      id: `date:${item.id}`,
      kind: 'date-uncertain',
      headline: item.title,
      summary: item.summary !== null && item.summary.trim().length > 0 ? item.summary : null,
      publisher: item.publisher,
      publishedAt: item.published_at,
      sourceUrl: item.url,
      relatedPublishers: [item.publisher],
      relatedCount: 1,
      dateConfidence: item.date_confidence,
    });
  }

  return cases;
}

function CaseArticle({ entry }: { entry: SecretCase }) {
  return <article className="border border-[#E8E5E0]/15 p-5">
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D32F2F]">
      {entry.kind === 'echo' ? `gema · ${formatNumber(entry.relatedCount)} artikel` : `tanggal ${entry.dateConfidence}`}
    </p>
    <h2 className="mt-3 font-sans text-xl font-semibold leading-snug text-[#E8E5E0]">{entry.headline}</h2>
    <blockquote className="mt-4 border-l-2 border-[#D32F2F] pl-4 text-sm leading-7 text-[#E8E5E0]/70">
      {entry.summary ?? <span className="font-mono text-[11px] text-[#E8E5E0]/40">Ringkasan tidak tersedia pada feed.</span>}
    </blockquote>
    <p className="mt-4 font-mono text-[10px] leading-5 text-[#E8E5E0]/45">
      {entry.publisher} · {formatDateTime(entry.publishedAt)} · <a className="text-[#E8E5E0]/70 underline decoration-[#D32F2F] underline-offset-2 hover:text-[#D32F2F]" href={entry.sourceUrl} rel="noopener noreferrer" target="_blank">sumber asli <ArrowUpRight aria-hidden="true" className="inline size-3" /></a>
    </p>
    {entry.kind === 'echo' ? <p className="mt-3 text-xs leading-6 text-[#E8E5E0]/55">Judul yang sama muncul di {formatNumber(entry.relatedPublishers.length)} publisher: {entry.relatedPublishers.join(' · ')}. Kesamaan teks tidak berarti kesamaan sudut pandang.</p> : null}
  </article>;
}

export function SecretTruthView({ calm, path }: { calm: boolean; path: string }) {
  const { data: response, error } = useSWR<NewsResponse, Error>('/api/news?since=24h&max_items=200', fetchNewsClient, { revalidateOnFocus: false, shouldRetryOnError: false });
  const cases = buildCases(response);

  return <GrungeShell calm={calm} eyebrow="arsip nyata" mode="truth" path={path} title="Yang Tertulis">
    <p className="max-w-2xl text-sm leading-7 text-[#E8E5E0]/70">Halaman ini tidak menyusun tuduhan dan tidak menambah nama. Judul serta ringkasan di bawah diambil apa adanya dari feed publik; yang ditambahkan hanya label netral tentang bentuk kemunculannya.</p>

    {error ? <section className="mt-8 border border-[#D32F2F]/60 p-5"><p className="font-mono text-[11px] text-[#D32F2F]">Feed tidak dapat dibaca.</p><p className="mt-2 text-xs leading-6 text-[#E8E5E0]/50">{error.message}</p></section> : null}

    {!response && !error ? <p className="mt-10 font-mono text-[11px] tracking-[0.2em] text-[#E8E5E0]/40">MEMBACA FEED...</p> : null}

    {response && cases.length === 0 ? <section className="mt-8 border border-[#E8E5E0]/15 p-5"><p className="font-mono text-[11px] text-[#E8E5E0]/60">Tidak ada kasus yang lolos ambang pada snapshot ini.</p></section> : null}

    {cases.length > 0 ? <ol className="mt-8 space-y-4">
      {cases.map((entry) => <li key={entry.id}><CaseArticle entry={entry} /></li>)}
    </ol> : null}

    <section className="mt-10 border-t border-[#E8E5E0]/15 pt-5 font-mono text-[10px] leading-5 text-[#E8E5E0]/40">
      <p>Sumber: /api/news · snapshot {response?.data ? formatDateTime(response.data.generated_at) : 'belum tersedia'}.</p>
      <p className="mt-1">Kasus dipilih deterministik: judul identik lintas publisher, lalu tanggal terbit yang tidak exact. Tidak ada individu baru yang disebut di halaman ini.</p>
    </section>
  </GrungeShell>;
}
