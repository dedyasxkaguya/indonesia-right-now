'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import Fuse from 'fuse.js';
import { ArrowRight, Bookmark, Clipboard, FileSearch, Search } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { fetchNewsClient } from '@/lib/api/client';
import { fetchRequestSchema } from '@/lib/api/schemas';
import { isSecretPath } from '@/lib/secret/routes';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { useBookmarks } from '@/hooks/useBookmarks';
import type { NewsData, NewsItem, NewsResponse } from '@/lib/types/api';

type CommandPaletteContextValue = { openPalette: () => void; closePalette: () => void; isPaletteOpen: boolean };
const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

const navigation = [
  { href: '/', label: 'Beranda' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analitik', label: 'Analitik' },
  { href: '/analisis-url', label: 'Analisis URL' },
  { href: '/tersimpan', label: 'Artikel tersimpan' },
  { href: '/hari-ini', label: 'Hari Ini' },
  { href: '/notebook', label: 'Notebook' },
  { href: '/bandingkan', label: 'Bandingkan' },
];
const EMPTY_ARTICLES: NewsItem[] = [];

export function CommandPaletteProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const hidden = isSecretPath(pathname);
  const { openReader } = useDrawer();
  const watchlist = useBookmarks();
  const { data: response } = useSWR<NewsResponse, Error>(open ? '/api/news?since=24h&max_items=100' : null, fetchNewsClient, { revalidateOnFocus: false, shouldRetryOnError: false });
  const data: NewsData | null = response?.data ?? null;

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => { setOpen(false); setQuery(''); }, []);

  useEffect(() => {
    if (hidden) {
      setOpen(false);
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hidden]);

  const articles = data?.items ?? EMPTY_ARTICLES;
  const fuse = useMemo(() => new Fuse(articles, { keys: ['title', 'summary', 'publisher', 'categories'], threshold: 0.35, ignoreLocation: true }), [articles]);
  const matchingArticles = query.trim() ? fuse.search(query).slice(0, 7).map((result) => result.item) : articles.slice(0, 5);
  const categories = [...new Set(articles.flatMap((item) => item.categories))].sort().slice(0, 8);
  const publisherCounts = new Map<string, { name: string; count: number }>();
  for (const article of articles) {
    const current = publisherCounts.get(article.publisher_domain) ?? { name: article.publisher, count: 0 };
    current.count += 1;
    publisherCounts.set(article.publisher_domain, current);
  }
  const publishers = [...publisherCounts].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])).slice(0, 5);

  async function analyzeClipboard() {
    try {
      const clipboard = await navigator.clipboard.readText();
      const parsed = fetchRequestSchema.safeParse({ url: clipboard.trim() });
      if (!parsed.success) {
        toast.error('Clipboard tidak berisi URL HTTP atau HTTPS yang valid.');
        return;
      }
      closePalette();
      router.push(`/analisis-url?url=${encodeURIComponent(parsed.data.url)}`);
    } catch { toast.error('Clipboard tidak dapat dibaca.'); }
  }

  const value = useMemo(() => ({ openPalette, closePalette, isPaletteOpen: open }), [closePalette, open, openPalette]);

  if (hidden) return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;

  return <CommandPaletteContext.Provider value={value}>
    {children}
    <Dialog.Root open={open} onOpenChange={(next) => next ? setOpen(true) : closePalette()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink-900/35" />
        <Dialog.Content aria-describedby="command-palette-description" className="fixed left-1/2 top-[12vh] z-[81] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 border border-paper-300 bg-paper-50 shadow-xl focus:outline-none">
          <Dialog.Title className="sr-only">Palet perintah</Dialog.Title>
          <Dialog.Description className="sr-only" id="command-palette-description">Cari halaman, kategori, atau artikel; jalankan aksi cepat.</Dialog.Description>
          <Command shouldFilter={false}>
            <div className="flex items-center gap-3 border-b border-paper-300 px-4">
              <Search aria-hidden="true" className="size-4 shrink-0 text-brand-red" />
              <Command.Input autoFocus className="h-14 min-w-0 flex-1 bg-transparent font-sans text-sm text-ink-900 outline-none placeholder:text-ink-400" onValueChange={setQuery} placeholder="Cari halaman, kategori, atau artikel..." value={query} />
              <kbd className="border border-paper-300 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">ESC</kbd>
            </div>
            <Command.List className="max-h-[min(68vh,34rem)] overflow-y-auto p-2 text-sm">
              <Command.Empty className="px-3 py-8 text-center text-sm text-ink-500">Tidak ada hasil.</Command.Empty>
              <Command.Group heading="Navigasi" className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400 [&_[cmdk-group-items]]:mt-2 [&_[cmdk-group-items]]:font-sans [&_[cmdk-group-items]]:text-sm [&_[cmdk-group-items]]:normal-case [&_[cmdk-group-items]]:tracking-normal">
                {navigation.filter((item) => !query.trim() || item.label.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id'))).map((item) => <Command.Item className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-ink-700 aria-selected:bg-paper-200 aria-selected:text-ink-900" key={item.href} onSelect={() => { closePalette(); router.push(item.href); }} value={`nav:${item.href}`}><ArrowRight aria-hidden="true" className="size-4 text-ink-400" />{item.label}</Command.Item>)}
              </Command.Group>
              {categories.length ? <Command.Group heading="Filter cepat" className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400 [&_[cmdk-group-items]]:mt-2 [&_[cmdk-group-items]]:font-sans [&_[cmdk-group-items]]:text-sm [&_[cmdk-group-items]]:normal-case [&_[cmdk-group-items]]:tracking-normal">
                {categories.filter((category) => !query.trim() || category.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id'))).map((category) => <Command.Item className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-ink-700 aria-selected:bg-paper-200 aria-selected:text-ink-900" key={category} onSelect={() => { closePalette(); router.push(`/dashboard?category=${encodeURIComponent(category)}`); }} value={`category:${category}`}>{category}<span className="ml-auto font-mono text-[10px] text-ink-400">kategori</span></Command.Item>)}
              </Command.Group> : null}
              {publishers.length ? <Command.Group heading="Publisher" className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400 [&_[cmdk-group-items]]:mt-2 [&_[cmdk-group-items]]:font-sans [&_[cmdk-group-items]]:text-sm [&_[cmdk-group-items]]:normal-case [&_[cmdk-group-items]]:tracking-normal">
                {publishers.filter(([domain, publisher]) => !query.trim() || `${publisher.name} ${domain}`.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id'))).map(([domain, publisher]) => <Command.Item className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-ink-700 aria-selected:bg-paper-200 aria-selected:text-ink-900" key={domain} onSelect={() => { closePalette(); router.push(`/publisher/${encodeURIComponent(domain)}`); }} value={`publisher:${domain}`}><ArrowRight aria-hidden="true" className="size-4 text-ink-400" /><span className="min-w-0 truncate">{publisher.name}</span><span className="ml-auto font-mono text-[10px] text-ink-400">{domain}</span></Command.Item>)}
              </Command.Group> : null}
              {matchingArticles.length ? <Command.Group heading="Artikel" className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400 [&_[cmdk-group-items]]:mt-2 [&_[cmdk-group-items]]:font-sans [&_[cmdk-group-items]]:text-sm [&_[cmdk-group-items]]:normal-case [&_[cmdk-group-items]]:tracking-normal">
                {matchingArticles.map((article) => <Command.Item className="flex cursor-pointer items-start gap-3 rounded-sm px-3 py-2.5 text-ink-700 aria-selected:bg-paper-200 aria-selected:text-ink-900" key={article.id} onSelect={() => { closePalette(); openReader(article.url, article); }} value={`article:${article.id}`}><FileSearch aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-red" /><span className="min-w-0"><span className="line-clamp-2 block leading-5">{article.title}</span><span className="mt-1 block font-mono text-[10px] text-ink-400">{article.publisher}</span></span></Command.Item>)}
              </Command.Group> : null}
              <Command.Group heading="Aksi" className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400 [&_[cmdk-group-items]]:mt-2 [&_[cmdk-group-items]]:font-sans [&_[cmdk-group-items]]:text-sm [&_[cmdk-group-items]]:normal-case [&_[cmdk-group-items]]:tracking-normal">
                <Command.Item className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-ink-700 aria-selected:bg-paper-200 aria-selected:text-ink-900" onSelect={() => void analyzeClipboard()} value="action:clipboard-url"><Clipboard aria-hidden="true" className="size-4 text-brand-red" />Analisis URL dari clipboard</Command.Item>
                <Command.Item className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-ink-700 aria-selected:bg-paper-200 aria-selected:text-ink-900" onSelect={() => { closePalette(); router.push('/tersimpan'); }} value="action:bookmarks"><Bookmark aria-hidden="true" className="size-4 text-brand-red" />Artikel tersimpan<span className="ml-auto font-mono text-[10px] text-ink-400">{watchlist.count}</span></Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </CommandPaletteContext.Provider>;
}

export function useCommandPalette() {
  const value = useContext(CommandPaletteContext);
  if (!value) throw new Error('useCommandPalette harus digunakan di dalam CommandPaletteProvider.');
  return value;
}
