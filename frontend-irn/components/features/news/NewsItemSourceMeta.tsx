import { Badge } from '@/components/ui/Badge';
import type { NewsItem } from '@/lib/types/api';

export function NewsItemSourceMeta({ item }: { item: NewsItem }) {
  const publisher = item.publisher.trim() || item.publisher_domain.trim();
  const author = item.author?.trim();
  const language = item.language?.trim();

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {publisher ? <Badge className="max-w-full truncate" title={item.publisher_domain || undefined}>Sumber · {publisher}</Badge> : null}
      {author ? <span>oleh {author}</span> : null}
      {language ? <Badge>{language}</Badge> : null}
    </span>
  );
}
