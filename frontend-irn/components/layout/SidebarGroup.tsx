'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useSidebar } from './SidebarProvider';

type SidebarGroupProps = {
  id: 'berita' | 'analitik' | 'tools' | 'personal';
  label: string;
  children: React.ReactNode;
};

export function SidebarGroup({ id, label, children }: SidebarGroupProps) {
  const { collapsed, groups, toggleGroup } = useSidebar();
  const isOpen = groups[id] ?? true;

  if (collapsed) {
    return (
      <div className="py-2 border-b border-paper-200 last:border-b-0">
        <div className="flex flex-col gap-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-paper-200 last:border-b-0">
      <button
        type="button"
        onClick={() => toggleGroup(id)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink-700 transition-colors"
      >
        <span>{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-3 transition-transform duration-150 ${
            isOpen ? '' : '-rotate-90'
          }`}
        />
      </button>
      {isOpen && <div className="mt-1 flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}
