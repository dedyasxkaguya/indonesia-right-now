import { describe, expect, it } from 'vitest';
import { newsItemSchema } from './schemas';
import { canonicalizeNewsQuery, isGovernmentSourceUrl } from './news-query';
import type { NewsItem } from '../types/api';
import { getNewsItemSnippet } from './news-item';

const item: NewsItem = {
  id: 'item-1',
  title: 'Diskusi komunitas',
  url: 'https://reddit.com/r/indonesia/comments/1',
  publisher: 'Reddit r/indonesia',
  publisher_domain: 'reddit.com',
  author: '/u/contoh',
  published_at: '2026-10-31T12:00:00Z',
  date_confidence: 'relative',
  summary: null,
  content: null,
  categories: ['community'],
  language: null,
  source_url: 'https://reddit.com/r/indonesia/new/.rss',
  fetched_at: '2026-10-31T12:01:00Z',
};

describe('news item contract', () => {
  it('accepts nullable fields and forward-compatible date confidence values', () => {
    expect(newsItemSchema.parse(item)).toEqual(item);
  });

  it('requires nullable fields to be present in the canonical shape', () => {
    const { author: _author, ...incomplete } = item;
    expect(newsItemSchema.safeParse(incomplete).success).toBe(false);
  });

  it('uses content as a short summary fallback and omits empty content', () => {
    expect(getNewsItemSnippet({ summary: null, content: '  Isi   tulisan panjang  ' })).toBe('Isi tulisan panjang');
    expect(getNewsItemSnippet({ summary: null, content: null })).toBeNull();
  });
});

describe('news proxy query contract', () => {
  it('converts deprecated plural filters to singular backend params', () => {
    const query = canonicalizeNewsQuery(new URLSearchParams(
      'categories=community&publishers=reddit.com&keywords=Jakarta&excludes=promo',
    ));
    expect(query.toString()).toBe('category=community&publisher=reddit.com&keyword=Jakarta&exclude=promo');
  });

  it('preserves canonical filters and blocks government feed hosts', () => {
    const query = canonicalizeNewsQuery(new URLSearchParams(
      'category=community&category=local&publisher=reddit.com&keyword=Jakarta&exclude=promo',
    ));
    expect(query.toString()).toBe('category=community&category=local&publisher=reddit.com&keyword=Jakarta&exclude=promo');
    expect(isGovernmentSourceUrl('https://kemkes.go.id/rss')).toBe(true);
    expect(isGovernmentSourceUrl('https://news.ycombinator.com/rss')).toBe(false);
  });
});
