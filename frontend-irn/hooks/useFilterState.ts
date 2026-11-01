'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type FilterState = { q: string; categories: string[]; publishers: string[]; since: string };
type FilterUpdates = Partial<FilterState>;

const FILTER_PAGES = ['/artikel', '/dashboard', '/hari-ini'];

function splitList(params: URLSearchParams, keys: string[], fallback: string[]): string[] {
  const key = keys.find((candidate) => params.has(candidate));
  if (!key) return fallback;
  return params.getAll(key).flatMap((value) => value.split(',')).map((entry) => entry.trim()).filter(Boolean);
}

export function useFilterState(defaults: Partial<FilterState> = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams?.toString() ?? '';
  const state = useMemo<FilterState>(() => {
    const params = new URLSearchParams(searchString);
    return {
      q: params.get('q') ?? defaults.q ?? '',
      categories: splitList(params, ['category', 'cat', 'categories'], defaults.categories ?? []),
      publishers: splitList(params, ['publisher', 'pub', 'publishers'], defaults.publishers ?? []),
      since: params.get('since') ?? defaults.since ?? '24h',
    };
  }, [defaults.categories, defaults.publishers, defaults.q, defaults.since, searchString]);

  const update = useCallback((updates: FilterUpdates) => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    // GUARD: only update URL on filter-supporting pages. Prevents firing during
    // unmount race when navigating to /baca (strips query param).
    if (!FILTER_PAGES.includes(currentPath)) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('category')) {
      const legacyCategory = params.get('cat') ?? params.get('categories');
      if (legacyCategory !== null) params.set('category', legacyCategory);
    }
    if (!params.has('publisher')) {
      const legacyPublisher = params.get('pub') ?? params.get('publishers');
      if (legacyPublisher !== null) params.set('publisher', legacyPublisher);
    }
    if (updates.q !== undefined) updates.q.trim() ? params.set('q', updates.q.trim()) : params.delete('q');
    if (updates.categories !== undefined) updates.categories.length ? params.set('category', updates.categories.join(',')) : params.delete('category');
    if (updates.publishers !== undefined) updates.publishers.length ? params.set('publisher', updates.publishers.join(',')) : params.delete('publisher');
    if (updates.since !== undefined) updates.since === '24h' ? params.delete('since') : params.set('since', updates.since);
    params.delete('cat');
    params.delete('pub');
    params.delete('categories');
    params.delete('publishers');
    const query = params.toString();
    router.replace(`${currentPath}${query ? `?${query}` : ''}`, { scroll: false });
  }, [router]);

  const setQ = useCallback((q: string) => update({ q }), [update]);
  const setCategories = useCallback((categories: string[]) => update({ categories }), [update]);
  const setPublishers = useCallback((publishers: string[]) => update({ publishers }), [update]);
  const setSince = useCallback((since: string) => update({ since }), [update]);
  const reset = useCallback(() => update({ q: '', categories: [], publishers: [], since: '24h' }), [update]);
  const remove = useCallback((type: keyof FilterState, value?: string) => {
    if (type === 'q') return update({ q: '' });
    if (type === 'since') return update({ since: '24h' });
    if (type === 'categories') return update({ categories: state.categories.filter((entry) => entry !== value) });
    return update({ publishers: state.publishers.filter((entry) => entry !== value) });
  }, [state.categories, state.publishers, update]);

  return { ...state, update, setQ, setCategories, setPublishers, setSince, reset, remove, hasFilters: Boolean(state.q || state.categories.length || state.publishers.length || state.since !== '24h') };
}