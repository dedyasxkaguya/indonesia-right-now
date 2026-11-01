export type Mode = 'irn' | 'igs';

export function getModeFromPath(pathname: string): Mode {
  return pathname === '/gov' || pathname.startsWith('/gov/') ? 'igs' : 'irn';
}
