'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';
import { Drawer as VaulDrawer } from 'vaul';
import { ExplainPanel } from '@/components/features/explain/ExplainPanel';
import type { ExplainComputeContext } from '@/lib/explain/registry';

type ExplainSelection = { id: string; context?: ExplainComputeContext };
type ExplainContextValue = { openId: string | null; openExplain: (id: string, context?: ExplainComputeContext) => void; closeExplain: () => void };
const ExplainContext = createContext<ExplainContextValue | null>(null);

function readExplainSelection(): ExplainSelection | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('explain');
  if (!id) return null;
  const publisherDomain = params.get('explainDomain') ?? undefined;
  const itemId = params.get('explainItem') ?? undefined;
  return { id, context: publisherDomain || itemId ? { publisherDomain, itemId } : undefined };
}

function writeExplainQuery(selection: ExplainSelection | null): void {
  const params = new URLSearchParams(window.location.search);
  params.delete('explainDomain');
  params.delete('explainItem');
  if (selection) {
    params.set('explain', selection.id);
    if (selection.context?.publisherDomain) params.set('explainDomain', selection.context.publisherDomain);
    if (selection.context?.itemId) params.set('explainItem', selection.context.itemId);
  } else {
    params.delete('explain');
    params.delete('explainDomain');
    params.delete('explainItem');
  }
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

export function ExplainProvider({ children }: PropsWithChildren) {
  const [selection, setSelection] = useState<ExplainSelection | null>(null);
  const pathname = usePathname();
  const openExplain = useCallback((id: string, context?: ExplainComputeContext) => { const next = { id, context }; setSelection(next); writeExplainQuery(next); }, []);
  const closeExplain = useCallback(() => { setSelection(null); writeExplainQuery(null); }, []);

  useEffect(() => {
    setSelection(readExplainSelection());
  }, [pathname]);

  useEffect(() => {
    const onPopState = () => setSelection(readExplainSelection());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const value = useMemo(() => ({ openId: selection?.id ?? null, openExplain, closeExplain }), [selection?.id, openExplain, closeExplain]);
  return <ExplainContext.Provider value={value}>
    {children}
    <VaulDrawer.Root direction="right" modal open={selection !== null} onOpenChange={(open) => { if (!open) closeExplain(); }}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-[90] bg-ink-900/35" />
        <VaulDrawer.Content className="fixed inset-y-0 right-0 z-[91] flex h-full w-[min(36rem,100vw)] flex-col border-l border-paper-300 bg-paper-100 shadow-xl focus:outline-none">
          <VaulDrawer.Title className="sr-only">Penjelasan metrik</VaulDrawer.Title>
          <VaulDrawer.Description className="sr-only">Rumus, sumber, dan batasan penghitungan metrik yang dipilih.</VaulDrawer.Description>
          {selection ? <ExplainPanel context={selection.context} id={selection.id} onClose={closeExplain} /> : null}
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  </ExplainContext.Provider>;
}

export function useExplain() {
  const value = useContext(ExplainContext);
  if (!value) throw new Error('useExplain harus digunakan di dalam ExplainProvider.');
  return value;
}
