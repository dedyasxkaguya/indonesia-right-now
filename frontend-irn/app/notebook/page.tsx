import type { Metadata } from 'next';
import { NotebookList } from '@/components/features/notebook/NotebookList';

export const metadata: Metadata = {
  title: 'Notebook',
  description: 'Simpan dan tinjau hasil analisis URL secara lokal di perangkat ini.',
};

export default function NotebookPage() {
  return <NotebookList />;
}
