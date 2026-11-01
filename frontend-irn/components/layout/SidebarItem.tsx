'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { useSidebar } from './SidebarProvider';
import { getModeFromPath } from '@/lib/mode';

type SidebarItemProps = {
  numeral: string;
  label: string;
  href: string;
  icon: LucideIcon;
  onClick?: () => void;
};

export function SidebarItem({ numeral, label, href, icon: Icon, onClick }: SidebarItemProps) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const mode = getModeFromPath(pathname ?? '/');
  const activeClasses = mode === 'igs'
    ? 'bg-paper-100 border-l-2 border-gov-primary text-ink-900 font-semibold pl-2.5'
    : 'bg-paper-100 border-l-2 border-brand-red text-ink-900 font-semibold pl-2.5';
  const hoverClasses = mode === 'igs' ? 'text-ink-700 hover:bg-paper-100 hover:text-gov-primary font-medium' : 'text-ink-700 hover:bg-paper-100 hover:text-brand-red font-medium';
  const iconClasses = mode === 'igs' ? 'text-gov-primary' : 'text-brand-red';

  const isActive = href === '/' || href === '/gov' ? pathname === href : (pathname ?? '').startsWith(href);

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={onClick}
      title={collapsed ? `${numeral} ${label}` : undefined}
      className={`group flex min-h-11 items-center gap-3 px-3 py-2 text-sm transition-colors duration-150 rounded-sm ${
        isActive
          ? activeClasses
          : hoverClasses
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`size-4 shrink-0 transition-colors ${
          isActive ? iconClasses : 'text-ink-500 group-hover:text-ink-900'
        }`}
      />
      {!collapsed && (
        <span className="flex items-center gap-2 truncate">
          <span className="font-mono text-[11px] text-ink-400 select-none">
            {numeral}
          </span>
          <span className="truncate">{label}</span>
        </span>
      )}
    </Link>
  );
}
