import type { Metadata } from 'next';
import { SavedArticlesView } from '@/components/features/SavedArticlesView';

export const metadata: Metadata = {
  title: 'Tersimpan',
  description: 'Bookmark artikel berita yang tersimpan secara lokal di perangkat ini.',
};

export default function SavedPage() {
  return <SavedArticlesView />;
}
