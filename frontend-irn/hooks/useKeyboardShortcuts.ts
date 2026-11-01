'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCommandPalette } from '@/components/layout/CommandPaletteProvider';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { useExplain } from '@/components/features/explain/ExplainProvider';

const sequenceRoutes: Record<string, string> = {
  h: '/', d: '/dashboard', a: '/analitik', u: '/analisis-url', t: '/tersimpan',
  i: '/hari-ini', n: '/notebook', b: '/bandingkan',
};

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.matches('input, textarea, select, [contenteditable="true"]') || target.isContentEditable);
}

export function useKeyboardShortcuts({ cheatsheetOpen, onOpenCheatsheet, onCloseCheatsheet }: { cheatsheetOpen: boolean; onOpenCheatsheet: () => void; onCloseCheatsheet: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { closePalette, isPaletteOpen } = useCommandPalette();
  const { closeDrawer, isDrawerOpen } = useDrawer();
  const { openId, closeExplain } = useExplain();
  const [waitingForSequence, setWaitingForSequence] = useState(false);
  const sequenceTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (sequenceTimer.current !== null) window.clearTimeout(sequenceTimer.current);
  }, []);

  useEffect(() => {
    function clearSequence() {
      if (sequenceTimer.current !== null) window.clearTimeout(sequenceTimer.current);
      sequenceTimer.current = null;
      setWaitingForSequence(false);
    }

    function closeTopmost() {
      if (isDrawerOpen) { closeDrawer(); return true; }
      if (openId) { closeExplain(); return true; }
      if (isPaletteOpen) { closePalette(); return true; }
      if (cheatsheetOpen) { onCloseCheatsheet(); return true; }
      return false;
    }

    function focusFeedItem(direction: 1 | -1) {
      const rows = [...document.querySelectorAll<HTMLElement>('[data-feed-item]')];
      if (!rows.length) return;
      const current = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('[data-feed-item]') : null;
      const currentIndex = current ? rows.indexOf(current) : -1;
      const nextIndex = currentIndex < 0 ? (direction > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, currentIndex + direction));
      rows[nextIndex]?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (closeTopmost()) { event.preventDefault(); event.stopPropagation(); clearSequence(); }
        return;
      }
      if (isTextEntry(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;

      if (waitingForSequence) {
        const route = sequenceRoutes[event.key.toLowerCase()];
        clearSequence();
        if (route) { event.preventDefault(); router.push(route); }
        return;
      }
      if (event.key.toLowerCase() === 'g') {
        setWaitingForSequence(true);
        sequenceTimer.current = window.setTimeout(clearSequence, 800);
        return;
      }
      if (event.key === '?' && !cheatsheetOpen) {
        event.preventDefault();
        try { window.localStorage.setItem('irn:shortcutsSeen:v1', 'true'); } catch { /* Optional preference marker. */ }
        onOpenCheatsheet();
        return;
      }
      if ((pathname === '/dashboard' || pathname === '/hari-ini') && event.key.toLowerCase() === 'j') { event.preventDefault(); focusFeedItem(1); return; }
      if ((pathname === '/dashboard' || pathname === '/hari-ini') && event.key.toLowerCase() === 'k') { event.preventDefault(); focusFeedItem(-1); return; }
      if (pathname === '/dashboard' && event.key === '/') {
        const input = document.querySelector<HTMLInputElement>('[data-news-search]');
        if (input) { event.preventDefault(); input.focus(); }
        return;
      }
      if (event.key === 'Enter' || event.key.toLowerCase() === 'b') {
        const row = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-feed-item]') : null;
        if (!row) return;
        if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.closest('button, a')) return;
        const selector = event.key === 'Enter' ? '[data-feed-reader]' : '[data-feed-bookmark]';
        const action = row.querySelector<HTMLButtonElement>(selector);
        if (action) { event.preventDefault(); action.click(); }
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => { window.removeEventListener('keydown', onKeyDown, true); };
  }, [cheatsheetOpen, closeDrawer, closeExplain, closePalette, isDrawerOpen, isPaletteOpen, onCloseCheatsheet, onOpenCheatsheet, openId, pathname, router, waitingForSequence]);

  return waitingForSequence;
}
