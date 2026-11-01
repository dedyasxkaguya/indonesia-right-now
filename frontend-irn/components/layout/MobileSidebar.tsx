'use client';

import React from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Home,
  Clock,
  Newspaper,
  LayoutDashboard,
  BarChart2,
  Building2,
  GraduationCap,
  HandHeart,
  GitCompare,
  Link2,
  Landmark,
  DollarSign,
  BookOpen,
  Bookmark,
  Accessibility,
  Search,
  Map,
  Wallet,
  Route,
  Leaf,
  Wheat,
} from 'lucide-react';
import { useSidebar } from './SidebarProvider';
import { SidebarItem } from './SidebarItem';
import { getSidebarSections } from '@/lib/site-config';
import { usePathname } from 'next/navigation';
import { getModeFromPath } from '@/lib/mode';
import { ModeToggle } from './ModeToggle';
import type { LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  home: Home,
  clock: Clock,
  newspaper: Newspaper,
  dashboard: LayoutDashboard,
  chart: BarChart2,
  building: Building2,
  'graduation-cap': GraduationCap,
  'hand-heart': HandHeart,
  landmark: Landmark,
  'dollar-sign': DollarSign,
  compare: GitCompare,
  link: Link2,
  book: BookOpen,
  bookmark: Bookmark,
  search: Search,
  map: Map,
  wallet: Wallet,
  road: Route,
  leaf: Leaf,
  wheat: Wheat,
};

export function MobileSidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname() ?? '/';
  const mode = getModeFromPath(pathname);
  const sections = getSidebarSections(mode);

  const handleA11yClick = () => {
    setMobileOpen(false);
    const button = document.querySelector('button[aria-label="Pengaturan aksesibilitas"]') as HTMLButtonElement | null;
    if (button) {
      button.click();
    }
  };

  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm transition-opacity" />
        <Dialog.Content
          aria-label="Navigasi ponsel"
          className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,85vw)] flex-col border-r border-paper-300 bg-paper-50 shadow-2xl focus:outline-none"
        >
          <div className="flex h-[76px] items-center justify-between px-5 border-b border-paper-300 shrink-0">
            <Link
              href={mode === 'igs' ? '/gov' : '/'}
              onClick={() => setMobileOpen(false)}
              className="inline-flex min-h-11 items-center font-sans text-sm font-bold text-ink-900"
            >
              {mode === 'igs'
                ? 'Indonesia Gov Stats'
                : <>indonesia-<span className="text-brand-red">right</span>-now</>}
            </Link>
            <Dialog.Close
              aria-label="Tutup navigasi"
              className="inline-flex size-11 items-center justify-center rounded-btn border border-paper-300 text-ink-700 hover:bg-paper-200 hover:text-ink-900"
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            {sections.map((section) => (
              <div key={section.section}>
                <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{section.section}</p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item, index) => {
                    const Icon = icons[item.icon] ?? Home;
                    return <SidebarItem key={item.href} numeral={String(index + 1).padStart(2, '0')} label={item.label} href={item.href} icon={Icon} onClick={() => setMobileOpen(false)} />;
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-paper-300 shrink-0">
            <ModeToggle mode={mode} onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={handleA11yClick}
              className="mt-2 flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-paper-100 rounded-sm transition-colors"
            >
              <Accessibility aria-hidden="true" className="size-4 shrink-0 text-ink-500" />
              <span>Aksesibilitas</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
