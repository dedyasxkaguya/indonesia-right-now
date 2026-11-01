'use client';

import { useEffect, useState } from 'react';
import { useSidebar } from './SidebarProvider';
import { usePathname } from 'next/navigation';
import { getModeFromPath } from '@/lib/mode';

type ThreadSection = { id: string; label: string };

type TheThreadProps = { sections: ThreadSection[] };

export function TheThread({ sections }: TheThreadProps) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const { collapsed } = useSidebar();
  const pathname = usePathname() ?? '/';
  const mode = getModeFromPath(pathname);

  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-25% 0px -60% 0px' });
    sections.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;
  return (
    <aside
      aria-label="Indeks bagian"
      className={`fixed bottom-12 top-24 z-30 hidden w-7 lg:block transition-[left] duration-200 ${
        collapsed ? 'left-[92px]' : 'left-[280px]'
      }`}
    >
      <div aria-hidden="true" className={`absolute bottom-0 left-3 top-0 w-px ${mode === 'igs' ? 'bg-gov-primary/50' : 'bg-brand-red/50'}`} />
      {sections.length === 0 ? <span aria-hidden="true" className={`absolute left-[9px] top-4 size-2 rounded-full ${mode === 'igs' ? 'bg-gov-primary' : 'bg-brand-red'}`} /> : null}
      <ol className="relative flex h-full flex-col justify-around">
        {sections.map((section, index) => <li key={section.id}>
          <a aria-current={active === section.id ? 'location' : undefined} aria-label={`${String(index + 1).padStart(2, '0')} ${section.label}`} className="group relative flex size-7 items-center justify-center" href={`#${section.id}`}>
            <span className={`size-2 rounded-full border transition-colors ${mode === 'igs' ? 'border-gov-primary' : 'border-brand-red'} ${active === section.id ? (mode === 'igs' ? 'bg-gov-primary' : 'bg-brand-red') : 'bg-paper-100'}`} />
            <span className="absolute left-7 whitespace-nowrap border border-paper-300 bg-paper-50 px-2 py-1 font-mono text-[10px] text-ink-700 opacity-0 transition-opacity group-hover:opacity-100">{section.label}</span>
          </a>
        </li>)}
      </ol>
    </aside>
  );
}
