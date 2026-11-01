'use client';

import { useSidebar } from './SidebarProvider';

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={`ml-0 min-w-0 transition-[margin] duration-200 ${
        collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
