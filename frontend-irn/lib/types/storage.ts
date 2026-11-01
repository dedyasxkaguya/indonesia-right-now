import type { FetchData, NewsData, NewsItem } from '@/lib/types/api';

export type NotebookEntry = {
  id?: number;
  kind: 'bookmark' | 'note';
  url: string;
  title: string;
  savedAt: string;
  article?: NewsItem;
  note?: string;
};

export type ReaderCacheEntry = {
  url: string;
  title: string;
  finalUrl: string;
  content: string;
  fetchedAt: string;
};

export type NotebookAnalysisRecord = {
  id: string;
  url: string;
  title: string;
  analyzedAt: number;
  result: FetchData;
};

export type NewsSnapshot = {
  id?: number;
  generatedAt: string;
  date: string;
  data: NewsData;
};
