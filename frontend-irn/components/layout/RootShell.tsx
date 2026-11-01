'use client';

import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getModeFromPath } from '@/lib/mode';
import irnSite from '@/content/irn/site.json';
import igsSite from '@/content/igs/site.json';

export function DynamicFavicon() {
  const mode = getModeFromPath(usePathname() ?? '/');

  useEffect(() => {
    const linkId = 'mode-favicon';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    link.href = mode === 'igs' ? igsSite.favicon : irnSite.favicon;
    link.dataset.fallbackApplied = 'false';
    link.onerror = () => {
      if (link?.dataset.fallbackApplied === 'false') {
        link.dataset.fallbackApplied = 'true';
        link.href = '/favicon.ico';
      }
    };
  }, [mode]);

  return null;
}

export function RootShell({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? '/';
  const mode = getModeFromPath(pathname);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  return <div data-mode={mode} className="contents"><DynamicFavicon />{children}</div>;
}
