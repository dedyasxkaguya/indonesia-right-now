const queryNames: Record<string, string> = {
  since: 'since',
  until: 'until',
  max_items: 'max_items',
  category: 'category',
  categories: 'category',
  publisher: 'publisher',
  publishers: 'publisher',
  keyword: 'keyword',
  keywords: 'keyword',
  exclude: 'exclude',
  excludes: 'exclude',
  sources: 'sources',
};

export function canonicalizeNewsQuery(searchParams: URLSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of searchParams) {
    const backendKey = queryNames[key];
    if (backendKey) query.append(backendKey, value);
  }
  return query;
}

export function isGovernmentSourceUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'go.id' || hostname.endsWith('.go.id');
  } catch {
    return false;
  }
}
