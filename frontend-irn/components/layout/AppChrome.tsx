'use client';

import type { PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';
import { isSecretPath } from '@/lib/secret/routes';

/** Hides the normal site chrome inside the hidden zone. */
export function AppChrome({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? '';
  if (isSecretPath(pathname)) return null;
  return <>{children}</>;
}
