import { describe, expect, it } from 'vitest';
import type { NewsData, NewsItem, NewsStats } from '../types/api';
import { computeCategoryVelocity } from './category-velocity';
import { computeDedupRate } from './dedup-rate';
import { computeKeywordGraph } from './keyword-graph';
import { computeLatency } from './latency';
import { computePipelineReliability } from './pipeline-reliability';
import { computePublisherDominance } from './publisher-dominance';
import { computeSourceHealth } from './source-health';
import { computeTrustScore } from './trust-score';
import { computeTopicClusters } from './topic-clusters';
import { computeImpactScore } from './impact-score';
import { computeCoverageMatrix } from './coverage-matrix';
import { computeEditorsPicks } from './editors-picks';

const now = Date.parse('2026-01-02T12:00:00.000Z');

function item(id: string, publishedOffsetHours: number, publisher: string, title: string): NewsItem {
  const publishedAt = new Date(now - publishedOffsetHours * 60 * 60 * 1000).toISOString();
  return {
    id,
    title,
    url: `https://example.test/${id}`,
    publisher,
    publisher_domain: 'example.test',
    author: null,
    published_at: publishedAt,
    date_confidence: 'exact',
    summary: null,
    content: null,
    categories: ['indonesia'],
    language: 'id',
    source_url: 'https://example.test/feed.xml',
    fetched_at: new Date(Date.parse(publishedAt) + 10 * 60 * 1000).toISOString(),
  };
}

const stats: NewsStats = {
  sources_total: 2,
  sources_ok: 1,
  sources_failed: 1,
  items_fetched: 4,
  items_kept: 3,
  items_deduped: 1,
};

const data: Pick<NewsData, 'stats' | 'sources'> = {
  stats,
  sources: [
    { url: 'https://one.test/feed', publisher: 'One', status: 'ok', fetched_at: new Date(now).toISOString(), items: 3, error: null },
    { url: 'https://two.test/feed', publisher: 'Two', status: 'error', fetched_at: new Date(now).toISOString(), items: 0, error: { code: 'FETCH_TIMEOUT', message: 'timeout' } },
  ],
};

const items = [
  item('a', 1, 'One', 'Berita Indonesia terbaru'),
  item('b', 2, 'One', 'Berita Indonesia hari ini'),
  item('c', 5, 'Two', 'Berita ekonomi Indonesia'),
];

describe('baseline transformers', () => {
  it('derives source, publisher, and pipeline summaries from input fields', () => {
    expect(computeSourceHealth(data).healthPct).toBe(50);
    expect(computeSourceHealth(data).errorCodes).toEqual([{ code: 'FETCH_TIMEOUT', count: 1 }]);
    expect(computePublisherDominance(items).publishers[0]).toMatchObject({ publisher: 'One', count: 2, sharePct: (2 / 3) * 100 });
    expect(computePipelineReliability(stats)).toMatchObject({ extractionYield: 0.75, dedupeRate: 0.25, fetchSuccessRate: 0.5 });
    expect(computeDedupRate(stats)).toMatchObject({ rate: 0.25, deduped: 1, fetched: 4 });
  });

  it('uses the supplied time boundary for velocity and publish-to-fetch latency', () => {
    const velocity = computeCategoryVelocity(items, now);
    expect(velocity.insufficient).toBe(false);
    expect(velocity.categories[0].category).toBe('indonesia');
    expect(computeCategoryVelocity(items)).toEqual(computeCategoryVelocity(items));
    expect(computeLatency(items)).toMatchObject({ median: 10, p95: 10, insufficient: false });
  });

  it('builds a stable keyword graph and reports empty inputs honestly', () => {
    const graph = computeKeywordGraph(items, { topN: 5 });
    expect(graph.nodes.some((node) => node.id === 'indonesia')).toBe(true);
    expect(graph.insufficient).toBe(false);
    expect(computeKeywordGraph([]).insufficient).toBe(true);
    expect(computeCategoryVelocity([], now).insufficient).toBe(true);
    expect(computeLatency([]).insufficient).toBe(true);
    expect(computePublisherDominance([]).insufficient).toBe(true);
  });
});

describe('Phase 4 transformers', () => {
  const first: NewsItem = { ...item('alpha-1', 0, 'Alpha', 'Indonesia membahas ekonomi nasional'), publisher_domain: 'alpha.test', categories: ['economy', 'politics', 'indonesia'], summary: 'a'.repeat(400) };
  const second: NewsItem = { ...item('beta-1', 0, 'Beta', 'Indonesia membahas ekonomi nasional hari ini'), publisher_domain: 'beta.test', categories: ['economy', 'politics', 'indonesia'], summary: 'b'.repeat(200) };
  const third: NewsItem = { ...item('gamma-1', 2, 'Gamma', 'Kecelakaan kapal nelayan pesisir'), publisher_domain: 'gamma.test', categories: ['indonesia'], summary: 'c'.repeat(200) };

  it('clusters similar titles and computes bounded deterministic impact scores', () => {
    const news = [first, second, third];
    const clusters = computeTopicClusters(news, 0.5);
    expect(clusters.insufficient).toBe(false);
    expect(clusters.clusters.find((cluster) => cluster.ids.includes(first.id))?.size).toBe(2);
    const scores = computeImpactScore(news, clusters, now);
    expect(scores[0]).toMatchObject({ id: first.id, components: { freshness: 1, breadth: 0.4, diversity: 1, depth: 1 } });
    expect(scores[0].score).toBeCloseTo(0.85);
    expect(computeImpactScore([], { clusters: [], insufficient: true }, now)).toEqual([]);
  });

  it('scores trust, coverage, and editors picks from source fields', () => {
    const sources = [{ url: 'https://alpha.test/feed.xml', publisher: 'Alpha', status: 'ok' as const, fetched_at: new Date(now).toISOString(), items: 1, error: null }];
    expect(computeTrustScore('alpha.test', [first], sources)).toMatchObject({ score: 97, subScores: { completeness: 100, reliability: 100 }, insufficient: false });
    expect(computeTrustScore('missing.test', [first], sources).insufficient).toBe(true);
    const matrix = computeCoverageMatrix([first, second, third]);
    expect(matrix).toMatchObject({ rows: ['Alpha', 'Beta', 'Gamma'], cols: ['indonesia', 'economy', 'politics'], max: 1, insufficient: false });
    const picks = computeEditorsPicks([first, second, third], 5, now);
    expect(picks[0].itemId).toBe(first.id);
    expect(picks[0].score).toBeCloseTo(2 / 3);
    expect(computeEditorsPicks([first, second, third], 5, now)).toEqual(picks);
    expect(computeEditorsPicks([], 5, now)).toEqual([]);
  });

  it('runs smoke test against real fixture (deterministic, <= 5 picks)', async () => {
    const fixture = await import('../../context/news-response.example.json');
    const fixtureData = (fixture.default || fixture) as unknown as { data: { items: NewsItem[] } };
    const items = fixtureData.data.items;
    const picks1 = computeEditorsPicks(items, 5);
    const picks2 = computeEditorsPicks(items, 5);
    expect(picks1.length).toBeLessThanOrEqual(5);
    expect(picks1.length).toBeGreaterThan(0);
    expect(picks1).toEqual(picks2);
  });
});
