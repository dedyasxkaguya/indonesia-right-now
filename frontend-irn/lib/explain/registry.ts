import type { NewsData } from '@/lib/types/api';
import { computeCategoryAffinity, computeCategorySourceDiversity, computeCategoryVelocity, computeCoverageMatrix, computeCrossSourceEcho, computeDateConfidenceDistribution, computeDedupRate, computeEditorsPicks, computeHeadlineLength, computeHeuristicVelocity, computeImpactScore, computeKeywordGraph, computeLatency, computePipelineReliability, computePublisherAffinity, computePublisherDominance, computePublisherErrorRecovery, computeRecentPublishRate, computeSourceFreshness, computeSourceHealth, computeStoryClusters, computeSummaryCompleteness, computeTemporalHotspots, computeTopicClusters, computeTrendForecast, computeTrustScore } from '@/lib/transformers';

export type ExplainValue = { value: string; steps: { label: string; value: string }[] };
export type ExplainComputeContext = { publisherDomain?: string; itemId?: string; filteredCount?: number; query?: string };
export type ExplainConfig = {
  id: string;
  title: string;
  oneLiner: string;
  formula: string;
  compute: (data: NewsData, context?: ExplainComputeContext) => ExplainValue;
  sourceFields: string[];
  caveats: string[];
  transformerFile: string;
};

const count = (value: number) => new Intl.NumberFormat('id-ID').format(value);
const pct = (value: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)}%`;

export const EXPLAIN_REGISTRY: Record<string, ExplainConfig> = {
  'source-health': {
    id: 'source-health', title: 'Kesehatan sumber', oneLiner: 'Persentase sumber yang berhasil mengembalikan feed pada snapshot ini.', formula: 'sources_ok / sources_total × 100',
    compute: (data) => ({ value: pct(data.stats.sources_total ? data.stats.sources_ok / data.stats.sources_total * 100 : 0), steps: [{ label: 'Sumber berhasil', value: count(data.stats.sources_ok) }, { label: 'Total sumber', value: count(data.stats.sources_total) }] }),
    sourceFields: ['stats.sources_ok', 'stats.sources_total', 'sources[].status'], caveats: ['Status mencerminkan satu respons, bukan riwayat uptime.'], transformerFile: 'lib/transformers/source-health.ts',
  },
  'items-kept': {
    id: 'items-kept', title: 'Artikel dikurasi', oneLiner: 'Jumlah item yang dipertahankan oleh collector pada respons feed.', formula: 'stats.items_kept',
    compute: (data, context) => { const items = context?.publisherDomain ? data.items.filter((item) => item.publisher_domain === context.publisherDomain) : null; const kept = items?.length ?? data.stats.items_kept; return { value: count(kept), steps: [{ label: context?.publisherDomain ? 'Item publisher' : 'Item dipertahankan', value: count(kept) }, { label: context?.publisherDomain ? 'Domain' : 'Item diambil', value: context?.publisherDomain ?? count(data.stats.items_fetched) }] }; },
    sourceFields: ['stats.items_kept', 'stats.items_fetched'], caveats: ['Nilai mengikuti statistik backend untuk snapshot saat ini.'], transformerFile: 'lib/types/api.ts',
  },
  'publisher-count': {
    id: 'publisher-count', title: 'Jumlah publisher', oneLiner: 'Jumlah domain publisher berbeda yang muncul pada snapshot feed.', formula: 'count(distinct items[].publisher_domain)',
    compute: (data) => { const domains = new Set(data.items.map((item) => item.publisher_domain)); return { value: count(domains.size), steps: [{ label: 'Domain publisher unik', value: count(domains.size) }, { label: 'Artikel dalam snapshot', value: count(data.items.length) }] }; },
    sourceFields: ['items[].publisher_domain'], caveats: ['Hanya publisher yang muncul dalam respons feed ini yang dihitung.'], transformerFile: 'lib/types/api.ts',
  },
  'filter-count': {
    id: 'filter-count', title: 'Hasil filter feed', oneLiner: 'Jumlah item yang cocok dengan pencarian dan filter client-side saat ini.', formula: 'count(filter(items, q, categories, publishers))',
    compute: (data, context) => ({ value: `${count(context?.filteredCount ?? data.items.length)} dari ${count(data.items.length)}`, steps: [{ label: 'Kata kunci', value: context?.query || 'Tidak ada' }, { label: 'Hasil cocok', value: count(context?.filteredCount ?? data.items.length) }, { label: 'Item tersedia', value: count(data.items.length) }] }),
    sourceFields: ['items[].title', 'items[].summary', 'items[].publisher', 'items[].categories'], caveats: ['Jumlah hasil berubah mengikuti filter URL yang aktif pada browser.'], transformerFile: 'hooks/useFilterState.ts',
  },
  'median-latency': {
    id: 'median-latency', title: 'Median latensi', oneLiner: 'Median jeda antara waktu terbit dan waktu fetch item yang valid.', formula: 'median((fetched_at − published_at) / 60.000)',
    compute: (data) => { const result = computeLatency(data.items); return { value: result.insufficient ? 'Belum tersedia' : `${result.median.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit`, steps: [{ label: 'Item dengan waktu valid', value: count(result.buckets.reduce((sum, bucket) => sum + bucket.count, 0)) }, { label: 'Median', value: result.insufficient ? '—' : `${result.median.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit` }] }; },
    sourceFields: ['items[].published_at', 'items[].fetched_at'], caveats: ['Item dengan tanggal tidak valid atau latensi negatif tidak dihitung.'], transformerFile: 'lib/transformers/latency.ts',
  },
  'dedup-rate': {
    id: 'dedup-rate', title: 'Tingkat deduplikasi', oneLiner: 'Bagian item yang dicatat backend sebagai duplikat.', formula: 'items_deduped / items_fetched × 100',
    compute: (data) => { const result = computeDedupRate(data.stats); return { value: result.insufficient ? 'Belum tersedia' : pct(result.rate * 100), steps: [{ label: 'Duplikat', value: count(result.deduped) }, { label: 'Item diambil', value: count(result.fetched) }] }; },
    sourceFields: ['stats.items_deduped', 'stats.items_fetched'], caveats: ['Definisi deduplikasi mengikuti backend.'], transformerFile: 'lib/transformers/dedup-rate.ts',
  },
  'publisher-dominance': {
    id: 'publisher-dominance', title: 'Dominasi publisher', oneLiner: 'Pangsa artikel per publisher di antara item yang tampil.', formula: 'jumlah item publisher / jumlah seluruh item × 100',
    compute: (data) => { const result = computePublisherDominance(data.items); const first = result.publishers[0]; return { value: first ? `${first.publisher} · ${pct(first.sharePct)}` : 'Belum tersedia', steps: first ? [{ label: 'Publisher teratas', value: first.publisher }, { label: 'Item', value: count(first.count) }, { label: 'Pangsa', value: pct(first.sharePct) }] : [] }; },
    sourceFields: ['items[].publisher', 'items[].publisher_domain'], caveats: ['Pangsa tidak mengukur total produksi publisher di luar feed yang dikonfigurasi.'], transformerFile: 'lib/transformers/publisher-dominance.ts',
  },
  'category-velocity': {
    id: 'category-velocity', title: 'Kecepatan kategori', oneLiner: 'Jumlah item kategori per jam dalam jendela 24 jam relatif terhadap data terbaru.', formula: 'count(items in each hourly bucket, last 24h)',
    compute: (data) => { const result = computeCategoryVelocity(data.items); const first = result.categories[0]; return { value: first ? `${first.category} · ${count(first.hourly.reduce((sum, value) => sum + value, 0))} artikel` : 'Belum tersedia', steps: first ? [{ label: 'Kategori teratas', value: first.category }, { label: 'Artikel dalam 24 jam', value: count(first.hourly.reduce((sum, value) => sum + value, 0)) }] : [] }; },
    sourceFields: ['items[].categories', 'items[].published_at'], caveats: ['Waktu bucket mengikuti timestamp UTC pada item; ini bukan prediksi tren.'], transformerFile: 'lib/transformers/category-velocity.ts',
  },
  'keyword-graph': {
    id: 'keyword-graph', title: 'Jaringan kata kunci', oneLiner: 'Kata pada judul dihubungkan saat muncul bersama dalam artikel yang sama.', formula: 'tokenize(items[].title) → co-occurrence pairs',
    compute: (data) => { const graph = computeKeywordGraph(data.items); return { value: graph.insufficient ? 'Belum tersedia' : `${count(graph.nodes.length)} kata · ${count(graph.edges.length)} hubungan`, steps: [{ label: 'Jumlah node', value: count(graph.nodes.length) }, { label: 'Jumlah hubungan', value: count(graph.edges.length) }] }; },
    sourceFields: ['items[].title', 'items[].categories'], caveats: ['Kata dihitung dari judul; jaringan bukan model topik atau sentimen.'], transformerFile: 'lib/transformers/keyword-graph.ts',
  },
  'pipeline-reliability': {
    id: 'pipeline-reliability', title: 'Kualitas pipeline', oneLiner: 'Rasio kurasi, deduplikasi, dan keberhasilan sumber dari statistik feed.', formula: 'items_kept / items_fetched; items_deduped / items_fetched; sources_ok / sources_total',
    compute: (data) => { const result = computePipelineReliability(data.stats); return { value: result.insufficient ? 'Belum tersedia' : `${pct(result.extractionYield * 100)} hasil kurasi`, steps: [{ label: 'Hasil kurasi', value: data.stats.items_fetched ? pct(result.extractionYield * 100) : '—' }, { label: 'Deduplikasi', value: data.stats.items_fetched ? pct(result.dedupeRate * 100) : '—' }, { label: 'Sumber berhasil', value: data.stats.sources_total ? pct(result.fetchSuccessRate * 100) : '—' }] }; },
    sourceFields: ['stats.items_kept', 'stats.items_fetched', 'stats.items_deduped', 'stats.sources_ok', 'stats.sources_total'], caveats: ['Rasio kurasi menggunakan item_kept dari feed; bukan evaluasi kualitas editorial.'], transformerFile: 'lib/transformers/pipeline-reliability.ts',
  },
  'trust-score': {
    id: 'trust-score', title: 'Skor kepercayaan publisher', oneLiner: 'Menggabungkan kesegaran, kelengkapan metadata, dan status sumber publisher.', formula: '0.4 × freshness + 0.3 × completeness + 0.3 × reliability',
    compute: (data, context) => { const domain = context?.publisherDomain ?? data.items[0]?.publisher_domain; if (!domain) return { value: 'Belum tersedia', steps: [] }; const score = computeTrustScore(domain, data.items, data.sources); return { value: score.insufficient ? 'Belum tersedia' : `${score.score} / 100`, steps: [{ label: 'Publisher', value: domain }, { label: 'Kesegaran', value: pct(score.subScores.freshness) }, { label: 'Kelengkapan', value: pct(score.subScores.completeness) }, { label: 'Keandalan', value: pct(score.subScores.reliability) }] }; },
    sourceFields: ['items[].publisher_domain', 'items[].published_at', 'items[].fetched_at', 'items[].summary', 'sources[].status'], caveats: ['Skor adalah heuristik transparansi feed, bukan jaminan kebenaran.'], transformerFile: 'lib/transformers/trust-score.ts',
  },
  'impact-score': {
    id: 'impact-score', title: 'Skor dampak', oneLiner: 'Mengurutkan item berdasarkan kesegaran, jangkauan cluster, ragam kategori, dan kedalaman ringkasan.', formula: '0.35 × freshness + 0.25 × breadth + 0.20 × diversity + 0.20 × depth',
    compute: (data, context) => { const latest = Math.max(0, ...data.items.map((item) => Date.parse(item.published_at)).filter(Number.isFinite)); const result = computeImpactScore(data.items, computeTopicClusters(data.items), latest); const chosen = result.find((entry) => entry.id === context?.itemId) ?? result[0]; return { value: chosen ? pct(chosen.score * 100) : 'Belum tersedia', steps: chosen ? Object.entries(chosen.components).map(([label, value]) => ({ label, value: pct(value * 100) })) : [] }; },
    sourceFields: ['items[].published_at', 'items[].publisher', 'items[].categories', 'items[].summary', 'items[].title'], caveats: ['Skor hanya membandingkan item di snapshot ini dan bukan prediksi dampak sosial.'], transformerFile: 'lib/transformers/impact-score.ts',
  },
  'coverage-matrix': {
    id: 'coverage-matrix', title: 'Cakupan kategori × publisher', oneLiner: 'Jumlah artikel pada setiap pasangan publisher dan kategori.', formula: 'count(items where publisher = P and category = C)',
    compute: (data) => { const matrix = computeCoverageMatrix(data.items); let best = { publisher: '', category: '', count: 0 }; matrix.rows.forEach((publisher, row) => matrix.cols.forEach((category, col) => { const value = matrix.cells[row]?.[col] ?? 0; if (value > best.count) best = { publisher, category, count: value }; })); return { value: matrix.insufficient ? 'Belum tersedia' : count(matrix.rows.length * matrix.cols.length) + ' sel', steps: best.count ? [{ label: 'Sel terpadat', value: `${best.publisher} · ${best.category} (${count(best.count)} artikel)` }, { label: 'Publisher', value: count(matrix.rows.length) }, { label: 'Kategori', value: count(matrix.cols.length) }] : [] }; },
    sourceFields: ['items[].publisher', 'items[].categories'], caveats: ['Matriks hanya menampilkan 10 publisher dan 8 kategori teratas.'], transformerFile: 'lib/transformers/coverage-matrix.ts',
  },
  'publisher-coverage': {
    id: 'publisher-coverage', title: 'Cakupan kategori publisher', oneLiner: 'Menghitung artikel publisher pada setiap kategori yang muncul di feed.', formula: 'count(items where publisher_domain = domain and category = C)',
    compute: (data, context) => { const items = context?.publisherDomain ? data.items.filter((item) => item.publisher_domain === context.publisherDomain) : data.items; const counts = new Map<string, number>(); for (const item of items) for (const category of new Set(item.categories)) counts.set(category, (counts.get(category) ?? 0) + 1); const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]; return { value: top ? `${top[0]} · ${count(top[1])} artikel` : 'Belum tersedia', steps: [{ label: 'Domain', value: context?.publisherDomain ?? 'Semua publisher' }, { label: 'Kategori teratas', value: top?.[0] ?? '—' }, { label: 'Artikel', value: count(top?.[1] ?? 0) }] }; },
    sourceFields: ['items[].publisher_domain', 'items[].categories'], caveats: ['Donut menampilkan lima kategori teratas dan menggabungkan sisanya.'], transformerFile: 'components/features/publisher/CoverageDonut.tsx',
  },
  'publisher-overlap': {
    id: 'publisher-overlap', title: 'Irisan kategori publisher', oneLiner: 'Publisher terkait diurutkan dari jumlah kategori teratas yang mereka bagikan.', formula: 'count(intersection(top3Categories(A), top3Categories(B)))',
    compute: (data, context) => { const counts = new Map<string, Map<string, number>>(); for (const item of data.items) { const publisher = counts.get(item.publisher_domain) ?? new Map<string, number>(); for (const category of new Set(item.categories)) publisher.set(category, (publisher.get(category) ?? 0) + 1); counts.set(item.publisher_domain, publisher); } const top = (domain: string) => [...(counts.get(domain) ?? new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([category]) => category); const own = new Set(top(context?.publisherDomain ?? '')); const related = [...counts.keys()].filter((domain) => domain !== context?.publisherDomain).map((domain) => ({ domain, count: top(domain).filter((category) => own.has(category)).length })).sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))[0]; return { value: related ? `${related.count} kategori` : 'Belum tersedia', steps: [{ label: 'Publisher', value: context?.publisherDomain ?? '—' }, { label: 'Publisher terkait', value: related?.domain ?? '—' }, { label: 'Kategori bersama', value: count(related?.count ?? 0) }] }; },
    sourceFields: ['items[].publisher_domain', 'items[].categories'], caveats: ['Irisan dihitung dari tiga kategori teratas per publisher pada snapshot ini.'], transformerFile: 'components/features/publisher/RelatedPublishers.tsx',
  },
  'editors-pick-reason': {
    id: 'editors-pick-reason', title: 'Alasan pilihan editor', oneLiner: 'Menyeimbangkan kepentingan kategori, keluasan publisher, kesegaran, dan kedalaman ringkasan.', formula: 'categoryImportance × publisherBreadth × recency × summaryFactor',
    compute: (data, context) => { const picks = computeEditorsPicks(data.items, 5); const chosen = picks.find((pick) => pick.itemId === context?.itemId) ?? picks[0]; return { value: chosen ? pct(chosen.score * 100) : 'Belum tersedia', steps: chosen ? [{ label: 'Artikel', value: chosen.title }, { label: 'Kepentingan kategori', value: pct(chosen.components.categoryImportance * 100) }, { label: 'Keluasan publisher', value: pct(chosen.components.publisherBreadth * 100) }, { label: 'Kesegaran', value: pct(chosen.components.recency * 100) }, { label: 'Kedalaman ringkasan', value: pct(chosen.components.summaryFactor * 100) }] : [] }; },
    sourceFields: ['items[].publisher', 'items[].categories', 'items[].published_at', 'items[].summary'], caveats: ['Skor peringkat deterministik memakai timestamp terbaru pada data sebagai acuan waktu.'], transformerFile: 'lib/transformers/editors-picks.ts',
  },
  'cross-source-echo': {
    id: 'cross-source-echo', title: 'Gema lintas sumber', oneLiner: 'Judul yang muncul di lebih dari satu publisher setelah normalisasi teks.', formula: 'count(distinct publishers | normalized_title match)',
    compute: (data) => { const result = computeCrossSourceEcho(data.items); const top = result.echoes[0]; return { value: top ? `${count(top.publisherCount)} publisher · ${count(result.totalEchoes)} artikel` : 'Belum tersedia', steps: top ? [{ label: 'Judul', value: top.displayTitle }, { label: 'Publisher', value: top.publishers.join(', ') }, { label: 'Gema terdeteksi', value: count(result.echoes.length) }, { label: 'Total item dalam gema', value: count(result.totalEchoes) }] : [] }; },
    sourceFields: ['items[].title', 'items[].publisher'], caveats: ['Judul dinormalisasi (lowercase, tanpa tanda baca, urutan kata diabaikan) — bukan analisis semantik.'], transformerFile: 'lib/transformers/cross-source-echo.ts',
  },
  'source-freshness': {
    id: 'source-freshness', title: 'Kesegaran sumber', oneLiner: 'Median jeda publish ke fetch per sumber yang berstatus ok.', formula: 'median(items[fetched_at] - items[published_at]) in minutes',
    compute: (data) => { const result = computeSourceFreshness(data.sources, data.items); const top = result.sources[0]; return { value: top ? `${top.publisher} · ${top.medianMinutes.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit` : 'Belum tersedia', steps: top ? [{ label: 'Publisher', value: top.publisher }, { label: 'Median', value: `${top.medianMinutes.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit` }, { label: 'Artikel', value: count(top.itemCount) }] : [] }; },
    sourceFields: ['sources[].url', 'items[].source_url', 'items[].published_at', 'items[].fetched_at'], caveats: ['Mengukur latensi publish ke fetch, bukan kesegaran editorial.'], transformerFile: 'lib/transformers/source-freshness.ts',
  },
  'temporal-hotspots': {
    id: 'temporal-hotspots', title: 'Jam sibuk', oneLiner: 'Distribusi jumlah artikel per jam terbit dalam zona waktu Asia/Jakarta.', formula: 'count(items | hour(published_at) === H)',
    compute: (data) => { const result = computeTemporalHotspots(data.items); const peak = result.hours[result.top3[0]]; return { value: peak ? `${String(peak.hour).padStart(2, '0')}:00 · ${count(peak.count)} artikel` : 'Belum tersedia', steps: result.top3.map((hour) => ({ label: `Puncak ${String(hour).padStart(2, '0')}:00`, value: `${count(result.hours[hour]?.count ?? 0)} artikel` })) }; },
    sourceFields: ['items[].published_at'], caveats: ['Zona waktu Asia/Jakarta. Jam sibuk ≠ jam penting editorial.'], transformerFile: 'lib/transformers/temporal-hotspots.ts',
  },
  'category-affinity': {
    id: 'category-affinity', title: 'Afinitas kategori', oneLiner: 'Pasangan kategori yang paling sering muncul bersama dalam satu artikel.', formula: 'count(items | categories ⊇ {a, b})',
    compute: (data) => { const result = computeCategoryAffinity(data.items); const top = result.pairs[0]; return { value: top ? `${top.a} + ${top.b} · ${count(top.count)}` : 'Belum tersedia', steps: result.pairs.slice(0, 3).map((pair) => ({ label: `${pair.a} + ${pair.b}`, value: `${count(pair.count)} artikel` })) }; },
    sourceFields: ['items[].categories'], caveats: ['Co-occurrence dalam satu artikel, bukan korelasi statistik.'], transformerFile: 'lib/transformers/category-affinity.ts',
  },
  'publisher-affinity': {
    id: 'publisher-affinity', title: 'Afinitas publisher', oneLiner: 'Publisher yang berbagi kategori liputan paling banyak.', formula: '|categories(A) ∩ categories(B)|',
    compute: (data) => { const result = computePublisherAffinity(data.items); const top = result.pairs[0]; return { value: top ? `${top.a} ↔ ${top.b} · ${count(top.weight)}` : 'Belum tersedia', steps: result.pairs.slice(0, 3).map((pair) => ({ label: `${pair.a} ↔ ${pair.b}`, value: pair.sharedCategories.join(', ') })) }; },
    sourceFields: ['items[].publisher', 'items[].categories'], caveats: ['Berdasarkan kategori yang keduanya liput, bukan volume atau kesamaan editorial.'], transformerFile: 'lib/transformers/publisher-affinity.ts',
  },
  'heuristic-velocity': {
    id: 'heuristic-velocity', title: 'Kecepatan kategori (heuristik)', oneLiner: 'Perubahan jumlah artikel 4 jam terakhir dibanding 4 jam sebelumnya.', formula: '(last4h - prev4h) / prev4h',
    compute: (data) => { const result = computeHeuristicVelocity(data.items, Date.now()); const top = result.categories[0]; return { value: top ? `${top.category} · ${pct(top.deltaPct)}` : 'Belum tersedia', steps: top ? [{ label: 'Kategori', value: top.category }, { label: '4 jam terakhir', value: count(top.last4h) }, { label: '4 jam sebelumnya', value: count(top.prev4h) }, { label: 'Arah', value: top.direction }] : [] }; },
    sourceFields: ['items[].categories', 'items[].published_at'], caveats: ['Label Heuristik. Bukan prediksi statistik. Selisih < 5% dianggap flat.'], transformerFile: 'lib/transformers/heuristic-velocity.ts',
  },
  'heuristic-trend-forecast': {
    id: 'heuristic-trend-forecast', title: 'Tren 12 jam', oneLiner: 'Regresi linear sederhana atas jumlah artikel per jam, diproyeksikan satu jam ke depan.', formula: 'y = slope·x + intercept, x = 12 → projectedNextHour',
    compute: (data) => { const result = computeTrendForecast(data.items, Date.now()); return { value: result.insufficient ? 'Belum tersedia' : `${result.projectedNextHour.toLocaleString('id-ID', { maximumFractionDigits: 1 })} artikel/jam`, steps: result.insufficient ? [] : [{ label: 'Slope', value: result.slope.toLocaleString('id-ID', { maximumFractionDigits: 2 }) }, { label: 'Intercept', value: result.intercept.toLocaleString('id-ID', { maximumFractionDigits: 2 }) }, { label: 'Proyeksi jam ke-13', value: result.projectedNextHour.toLocaleString('id-ID', { maximumFractionDigits: 1 }) }, { label: 'Metode', value: result.method }] }; },
    sourceFields: ['items[].published_at'], caveats: ['Linear regression sederhana. Tidak memperhitungkan musiman, jam sibuk, atau event. Gunakan hanya sebagai indikator arah.'], transformerFile: 'lib/transformers/heuristic-trend-forecast.ts',
  },
  'headline-length-pattern': {
    id: 'headline-length-pattern', title: 'Panjang judul per kategori', oneLiner: 'Rata-rata jumlah kata pada judul untuk setiap kategori.', formula: 'mean(words(title)) per category',
    compute: (data) => { const result = computeHeadlineLength(data.items); const top = result.categories[0]; return { value: top ? `${top.category} · ${top.meanWords.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kata` : 'Belum tersedia', steps: result.categories.slice(0, 3).map((row) => ({ label: row.category, value: `${row.meanWords.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kata · ${count(row.n)} artikel` })) }; },
    sourceFields: ['items[].title', 'items[].categories'], caveats: ['Rata-rata kata per judul, bukan panjang karakter. Tidak mengukur kualitas.'], transformerFile: 'lib/transformers/headline-length.ts',
  },
  'category-source-diversity': {
    id: 'category-source-diversity', title: 'Keberagaman sumber per kategori', oneLiner: 'Jumlah publisher berbeda yang memberitakan setiap kategori.', formula: 'count(distinct publisher | category = C)',
    compute: (data) => { const result = computeCategorySourceDiversity(data.items); const top = result.categories[0]; return { value: top ? `${top.category} · ${count(top.publisherCount)} publisher` : 'Belum tersedia', steps: result.categories.slice(0, 3).map((row) => ({ label: row.category, value: `${count(row.publisherCount)} publisher · ${count(row.itemCount)} artikel` })) }; },
    sourceFields: ['items[].publisher', 'items[].categories'], caveats: ['Banyak publisher ≠ banyak perspektif.'], transformerFile: 'lib/transformers/category-diversity.ts',
  },
  'story-clusters': {
    id: 'story-clusters', title: 'Klaster cerita', oneLiner: 'Kelompok judul serupa dengan ambang Jaccard 0,4 (lebih longgar dari halaman depan).', formula: 'Jaccard(title_tokens(A), title_tokens(B)) >= 0.4 → same cluster',
    compute: (data) => { const result = computeStoryClusters(data.items); const top = result.clusters[0]; return { value: result.insufficient ? 'Belum tersedia' : `${count(result.clusters.length)} klaster`, steps: top ? [{ label: 'Judul perwakilan', value: top.representativeTitle }, { label: 'Ukuran', value: `${count(top.size)} artikel` }, { label: 'Anggota', value: count(top.ids.length) }] : [] }; },
    sourceFields: ['items[].title'], caveats: ['Berbasis token judul, bukan analisis semantik. Threshold lebih longgar dari F10 (0.4 vs 0.5).'], transformerFile: 'lib/transformers/story-clusters.ts',
  },
  'recent-publish-rate': {
    id: 'recent-publish-rate', title: 'Laju publikasi terbaru', oneLiner: 'Jumlah artikel publisher dalam 1 jam dan 6 jam terakhir.', formula: 'count(items | publisher=P ∧ published_at >= now - 1h/6h)',
    compute: (data) => { const result = computeRecentPublishRate(data.items, Date.now()); const top = result.publishers[0]; return { value: top ? `${top.publisher} · ${count(top.last1h)} / ${count(top.last6h)}` : 'Belum tersedia', steps: top ? [{ label: 'Publisher', value: top.publisher }, { label: '1 jam terakhir', value: count(top.last1h) }, { label: '6 jam terakhir', value: count(top.last6h) }] : [] }; },
    sourceFields: ['items[].publisher', 'items[].published_at'], caveats: ['Menunjukkan aktivitas terbaru, bukan kualitas atau kepentingan.'], transformerFile: 'lib/transformers/recent-publish-rate.ts',
  },
  'date-confidence-distribution': {
    id: 'date-confidence-distribution', title: 'Distribusi keyakinan tanggal', oneLiner: 'Proporsi artikel berdasarkan tingkat keyakinan tanggal terbit.', formula: 'count(items | date_confidence = X) / total',
    compute: (data) => { const result = computeDateConfidenceDistribution(data.items); return { value: result.insufficient ? 'Belum tersedia' : `${pct(result.pctExact)} exact`, steps: result.insufficient ? [] : [{ label: 'Exact', value: `${count(result.exact)} · ${pct(result.pctExact)}` }, { label: 'Approx', value: `${count(result.approx)} · ${pct(result.pctApprox)}` }, { label: 'Unknown', value: `${count(result.unknown)} · ${pct(result.pctUnknown)}` }] }; },
    sourceFields: ['items[].date_confidence'], caveats: ['`approx` berarti tanggal terbit adalah perkiraan. `unknown` = tidak tersedia.'], transformerFile: 'lib/transformers/date-confidence.ts',
  },
  'summary-completeness': {
    id: 'summary-completeness', title: 'Kelengkapan ringkasan', oneLiner: 'Bagian artikel yang memiliki ringkasan tidak kosong.', formula: 'count(summary ≠ null) / total',
    compute: (data) => { const result = computeSummaryCompleteness(data.items); return { value: result.insufficient ? 'Belum tersedia' : pct(result.pct), steps: result.insufficient ? [] : [{ label: 'Dengan ringkasan', value: count(result.withSummary) }, { label: 'Total artikel', value: count(result.total) }] }; },
    sourceFields: ['items[].summary'], caveats: ['Ringkasan teknis dari backend, bukan ringkasan editorial.'], transformerFile: 'lib/transformers/summary-completeness.ts',
  },
  'publisher-error-recovery': {
    id: 'publisher-error-recovery', title: 'Kode error sumber', oneLiner: 'Distribusi kode error pada sumber yang gagal, beserta publisher terdampak.', formula: "count(sources | status='error' ∧ error.code=X)",
    compute: (data) => { const result = computePublisherErrorRecovery(data.sources); const top = result.codes[0]; return { value: result.insufficient ? 'Tidak ada error' : `${top.code} · ${count(top.count)} sumber`, steps: result.codes.slice(0, 3).map((row) => ({ label: row.code, value: `${count(row.count)} sumber · ${row.publishers.join(', ')}` })) }; },
    sourceFields: ['sources[].status', 'sources[].error.code', 'sources[].publisher'], caveats: ['Menampilkan error code dari backend. `feed_not_found`, `network_error`, `http_error` adalah contoh umum.'], transformerFile: 'lib/transformers/publisher-error-recovery.ts',
  },
};
