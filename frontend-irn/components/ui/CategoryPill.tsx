'use client';

import { getCategoryStyle } from '@/lib/utils/category-style';

export function CategoryPill({ category }: { category: string }) {
  const { color, icon: Icon } = getCategoryStyle(category);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption"
      style={{ color, backgroundColor: `${color}20` }}
    >
      <Icon aria-hidden="true" size={12} strokeWidth={2} />
      {category}
    </span>
  );
}
