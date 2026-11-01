'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

type PublisherOption = { domain: string; name: string };

export function PublisherCompareControl({ currentDomain, options }: { currentDomain: string; options: PublisherOption[] }) {
  const [other, setOther] = useState('');
  const router = useRouter();
  const available = options.filter((option) => option.domain !== currentDomain);
  return <div className="flex flex-wrap items-end gap-2">
    <label className="min-w-[220px]"><span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Bandingkan dengan</span><select className="min-h-10 w-full border border-paper-300 bg-paper-50 px-3 text-xs text-ink-900" onChange={(event) => setOther(event.target.value)} value={other}><option value="">Pilih publisher</option>{available.map((option) => <option key={option.domain} value={option.domain}>{option.name}</option>)}</select></label>
    <Button disabled={!other} onClick={() => router.push(`/bandingkan?a=${encodeURIComponent(currentDomain)}&b=${encodeURIComponent(other)}`)} size="sm" variant="secondary">Bandingkan</Button>
  </div>;
}
