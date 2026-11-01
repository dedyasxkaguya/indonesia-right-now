import irnSite from '@/content/irn/site.json';
import igsSite from '@/content/igs/site.json';
import type { Mode } from '@/lib/mode';

export type SidebarSection = { section: string; items: { label: string; href: string; icon: string }[] };

export function getSidebarSections(mode: Mode): SidebarSection[] {
  return mode === 'igs' ? igsSite.sidebar : irnSite.sidebar;
}
