'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { NewsItem } from '@/lib/types/api';

const colors = ['#D32F2F', '#B45309', '#4A148C', '#A02020', '#8C8882'];

export function CoverageDonut({ items }: { items: NewsItem[] }) {
  const counts = new Map<string, number>();
  for (const item of items) for (const category of new Set(item.categories)) counts.set(category, (counts.get(category) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const visible = top.slice(0, 5).map(([name, value], index) => ({ name, value, fill: colors[index] }));
  const otherCount = top.slice(5).reduce((sum, entry) => sum + entry[1], 0);
  if (otherCount) visible.push({ name: 'Lainnya', value: otherCount, fill: '#B8B4AE' });
  if (!visible.length) return <p className="text-sm text-ink-500">Kategori belum tersedia.</p>;
  return <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(160px,1fr)_minmax(120px,1fr)]">
    <div aria-label="Donut distribusi kategori publisher" className="h-48" role="img"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={visible} dataKey="value" innerRadius="54%" outerRadius="78%" paddingAngle={1} stroke="#F7F3EC">{visible.map((entry) => <Cell fill={entry.fill} key={entry.name} />)}</Pie><Tooltip contentStyle={{ background: '#FDFBF6', border: '1px solid #D9D2C4', borderRadius: 0, fontSize: 12 }} /></PieChart></ResponsiveContainer></div>
    <ul className="space-y-2">{visible.map((entry) => <li className="flex items-center justify-between gap-3 text-xs" key={entry.name}><span className="flex min-w-0 items-center gap-2 text-ink-700"><span aria-hidden="true" className="size-2 shrink-0" style={{ backgroundColor: entry.fill }} /><span className="truncate">{entry.name}</span></span><span className="font-mono text-ink-500">{entry.value}</span></li>)}</ul>
  </div>;
}
