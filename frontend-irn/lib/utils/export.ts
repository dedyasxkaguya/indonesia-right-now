import Papa from 'papaparse';
import type { NewsData } from '@/lib/types/api';

export function exportCSV(items: NewsData['items'], filename = 'indonesia-right-now-export.csv'): void {
  const rows = items.map((item) => ({
    id: item.id,
    title: item.title,
    publisher: item.publisher,
    categories: item.categories.join('; '),
    published_at: item.published_at,
    url: item.url,
    summary: item.summary ?? '',
    sentiment_score: '',
    sentiment_label: '',
  }));

  const csv = '\uFEFF' + Papa.unparse(rows); // UTF-8 BOM for Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function withWatermark(dataUrl: string): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0);
  context.font = '500 16px "IBM Plex Mono", monospace';
  context.fillStyle = 'rgba(20, 20, 20, 0.55)';
  context.textAlign = 'right';
  const stamp = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  context.fillText(`indonesia-right-now · ${stamp}`, image.width - 24, image.height - 20);
  return canvas.toDataURL('image/png');
}

export async function exportPNG(elementId: string, filename = 'indonesia-right-now.png'): Promise<void> {
  if (window.matchMedia('(max-width: 767px)').matches) {
    throw new Error('Ekspor PNG hanya tersedia pada layar lebar.');
  }
  const { toPng } = await import('html-to-image');
  const node = document.getElementById(elementId);
  if (!node) throw new Error('Area tangkapan layar tidak ditemukan.');
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 500));
  const dataUrl = await toPng(node, { cacheBust: true, backgroundColor: '#F7F3EC' });
  const watermarked = await withWatermark(dataUrl);
  const link = document.createElement('a');
  link.download = filename;
  link.href = watermarked;
  link.click();
}
