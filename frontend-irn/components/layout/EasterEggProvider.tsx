'use client';

import type { PropsWithChildren } from 'react';
import { AltZIPortal } from '@/components/features/secret/AltZIPortal';
import { KonamiLayer } from '@/components/features/secret/KonamiLayer';
import { useEasterEgg } from '@/hooks/useEasterEgg';

/** F20 — mounts exactly two easter eggs: Konami glitch and the Alt+Z,I portal. */
export function EasterEggProvider({ children }: PropsWithChildren) {
  const { konamiActive, portalOpen, closeKonami, closePortal } = useEasterEgg();
  return <>
    {children}
    <KonamiLayer active={konamiActive} onClose={closeKonami} />
    <AltZIPortal open={portalOpen} onClose={closePortal} />
  </>;
}
