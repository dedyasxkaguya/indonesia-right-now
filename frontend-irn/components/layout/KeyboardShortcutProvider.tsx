'use client';

import { useCallback, useState, type PropsWithChildren } from 'react';
import { ShortcutsCheatsheet } from '@/components/layout/ShortcutsCheatsheet';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutProvider({ children }: PropsWithChildren) {
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const openCheatsheet = useCallback(() => setCheatsheetOpen(true), []);
  const closeCheatsheet = useCallback(() => setCheatsheetOpen(false), []);
  const waitingForSequence = useKeyboardShortcuts({ cheatsheetOpen, onOpenCheatsheet: openCheatsheet, onCloseCheatsheet: closeCheatsheet });

  return <>
    {children}
    {waitingForSequence ? <div aria-live="polite" className="fixed bottom-6 right-6 z-40 rounded-pill bg-paper-200 px-2 py-1 font-mono text-caption text-ink-500">g …</div> : null}
    <ShortcutsCheatsheet open={cheatsheetOpen} onOpenChange={setCheatsheetOpen} />
  </>;
}
