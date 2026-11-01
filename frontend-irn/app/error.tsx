'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><StateCard variant="error" title="Halaman tidak dapat ditampilkan" description="Terjadi kendala saat memuat halaman." action={<Button onClick={reset}>Coba lagi</Button>} /></div>;
}
