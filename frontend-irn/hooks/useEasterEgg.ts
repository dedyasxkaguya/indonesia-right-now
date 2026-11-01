'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'] as const;
const SEQUENCE_GAP_MS = 1500;
const PORTAL_ARM_MS = 2500;
const KONAMI_VISIBLE_MS = 4200;

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.matches('input, textarea, select, [contenteditable="true"]') || target.isContentEditable);
}

function normalizeKey(event: KeyboardEvent): string {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

/**
 * F20 — exactly two easter eggs:
 * 1. Konami sequence ↑↑↓↓←→←→BA shows a short glitch layer.
 * 2. Alt+Z, then I opens the hidden-door portal.
 */
export function useEasterEgg() {
  const [konamiActive, setKonamiActive] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const step = useRef(0);
  const lastKeyAt = useRef(0);
  const portalArmedUntil = useRef(0);

  const closeKonami = useCallback(() => setKonamiActive(false), []);
  const closePortal = useCallback(() => setPortalOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || isTextEntry(event.target)) return;

      if (event.altKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        portalArmedUntil.current = performance.now() + PORTAL_ARM_MS;
        step.current = 0;
        return;
      }

      const portalArmed = performance.now() <= portalArmedUntil.current;
      if (portalArmed && !event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        portalArmedUntil.current = 0;
        setPortalOpen(true);
        return;
      }

      const now = performance.now();
      if (now - lastKeyAt.current > SEQUENCE_GAP_MS) step.current = 0;
      lastKeyAt.current = now;

      const pressed = normalizeKey(event);
      if (pressed === KONAMI[step.current]) {
        step.current += 1;
        if (step.current === KONAMI.length) {
          step.current = 0;
          lastKeyAt.current = 0;
          event.preventDefault();
          setKonamiActive(true);
        }
        return;
      }

      step.current = pressed === KONAMI[0] ? 1 : 0;
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!konamiActive) return;
    const timer = window.setTimeout(() => setKonamiActive(false), KONAMI_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [konamiActive]);

  return { konamiActive, portalOpen, closeKonami, closePortal };
}
