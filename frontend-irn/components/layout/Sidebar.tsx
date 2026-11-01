'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
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
import { ModeToggle } from './ModeToggle';
import { getSidebarSections } from '@/lib/site-config';
import { getModeFromPath } from '@/lib/mode';
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

export function Sidebar({ mode: suppliedMode }: { mode?: 'irn' | 'igs' }) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const pathname = usePathname() ?? '/';
  const mode = suppliedMode ?? getModeFromPath(pathname);
  const sections = getSidebarSections(mode);

  const handleA11yClick = () => {
    // Triggers the existing A11yPanel by finding its floating button or firing custom event
    const button = document.querySelector('button[aria-label="Pengaturan aksesibilitas"]') as HTMLButtonElement | null;
    if (button) {
      button.click();
    }
  };

  return (
    <aside
      aria-label="Sidebar navigasi"
      className={`fixed left-0 top-0 bottom-0 z-30 hidden lg:flex flex-col bg-paper-50 border-r border-paper-300 transition-all duration-200 select-none ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex h-[76px] items-center justify-between px-4 border-b border-paper-300 shrink-0">
        {!collapsed && (
          <Link
            href={mode === 'igs' ? '/gov' : '/'}
            className="inline-flex min-h-11 items-center font-sans text-sm font-bold text-ink-900 truncate tracking-tight"
          >
            {mode === 'igs'
              ? 'Indonesia Gov Stats'
              : <>indonesia-<span className="text-brand-red">right</span>-now</>}
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          className={`inline-flex size-11 items-center justify-center rounded-btn border border-paper-300 bg-paper-100 text-ink-600 hover:text-brand-red hover:border-brand-red transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red ${
            collapsed ? 'mx-auto' : ''
          }`}
        >
          {collapsed ? (
            <ChevronRight aria-hidden="true" className="size-4" />
          ) : (
            <ChevronLeft aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {sections.map((section) => (
          <div key={section.section} className="py-2 border-b border-paper-200 last:border-b-0">
            {!collapsed ? <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{section.section}</p> : null}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item, index) => {
                const Icon = icons[item.icon] ?? Home;
                return <SidebarItem key={item.href} numeral={String(index + 1).padStart(2, '0')} label={item.label} href={item.href} icon={Icon} />;
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-paper-300 shrink-0">
        <ModeToggle mode={mode} collapsed={collapsed} />
        <button
          type="button"
          onClick={handleA11yClick}
          title={collapsed ? 'Aksesibilitas' : undefined}
          className={`mt-2 flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-paper-100 rounded-sm transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <Accessibility aria-hidden="true" className="size-4 shrink-0 text-ink-500" />
          {!collapsed && <span>Aksesibilitas</span>}
        </button>
      </div>
    </aside>
  );
}
