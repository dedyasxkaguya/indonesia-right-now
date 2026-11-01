'use client';

import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { storage } from '@/lib/storage';

type StorageContextValue = { ready: boolean };
const StorageContext = createContext<StorageContextValue>({ ready: false });

export function StorageProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void storage.migrate().then(() => {
      if (mounted) setReady(true);
    }).catch(() => {
      if (mounted) setReady(false);
    });
    return () => { mounted = false; };
  }, []);
  return <StorageContext.Provider value={{ ready }}>{children}</StorageContext.Provider>;
}

export function useStorageReady(): boolean {
  return useContext(StorageContext).ready;
}
