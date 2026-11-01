'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Drawer as VaulDrawer } from 'vaul';
import { usePathname } from 'next/navigation';
import { ReaderDrawer } from '@/components/features/ReaderDrawer';
import type { NewsItem } from '@/lib/types/api';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';
type ReaderSelection = { url: string; article?: NewsItem | null; size: DrawerSize; title?: string };
type DrawerContextValue = { openReader: (url: string, article?: NewsItem, size?: DrawerSize, title?: string) => void; closeDrawer: () => void; isDrawerOpen: boolean };
const DrawerContext = createContext<DrawerContextValue | null>(null);
const drawerWidths: Record<DrawerSize, string> = {
  sm: 'w-[min(24rem,100vw)]',
  md: 'w-[min(36rem,100vw)]',
  lg: 'w-[min(48rem,100vw)]',
  full: 'w-screen',
};

function updateDrawerQuery(selection: ReaderSelection | null): void {
  const params = new URLSearchParams(window.location.search);
  if (selection) {
    params.set('drawer', 'reader');
    params.set('url', selection.url);
  } else {
    params.delete('drawer');
    params.delete('url');
  }
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

export function DrawerProvider({ children }: PropsWithChildren) {
  const [reader, setReader] = useState<ReaderSelection | null>(null);
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  const openReader = useCallback((url: string, article?: NewsItem, size: DrawerSize = 'lg', title?: string) => {
    const selection = { url, article, size, title };
    setReader(selection);
    updateDrawerQuery(selection);
  }, []);

  const closeDrawer = useCallback(() => {
    setReader(null);
    updateDrawerQuery(null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    if (params.get('drawer') === 'reader' && url) setReader({ url, size: 'lg' });
    const onPopState = () => {
      const current = new URLSearchParams(window.location.search);
      const currentUrl = current.get('url');
      setReader(current.get('drawer') === 'reader' && currentUrl ? { url: currentUrl, size: 'lg' } : null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      closeDrawer();
    }
  }, [closeDrawer, pathname]);

  const value = useMemo(() => ({ openReader, closeDrawer, isDrawerOpen: reader !== null }), [openReader, closeDrawer, reader]);

  return <DrawerContext.Provider value={value}>
    {children}
    <VaulDrawer.Root direction="right" modal open={reader !== null} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-[70] bg-ink-900/35" />
        <VaulDrawer.Content className={`fixed inset-y-0 right-0 z-[71] flex h-full ${drawerWidths[reader?.size ?? 'lg']} flex-col border-l border-paper-300 bg-paper-100 shadow-xl focus:outline-none`}>
          <VaulDrawer.Title className="sr-only">Reader berita</VaulDrawer.Title>
          <VaulDrawer.Description className="sr-only">Konten artikel yang diambil melalui backend dan disanitasi untuk ditampilkan.</VaulDrawer.Description>
          {reader ? <ReaderDrawer article={reader.article} fallbackTitle={reader.title} onClose={closeDrawer} url={reader.url} /> : null}
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  </DrawerContext.Provider>;
}

export function useDrawer() {
  const value = useContext(DrawerContext);
  if (!value) throw new Error('useDrawer harus digunakan di dalam DrawerProvider.');
  return value;
}
