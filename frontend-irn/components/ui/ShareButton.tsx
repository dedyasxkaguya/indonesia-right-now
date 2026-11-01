'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

export function ShareButton({ url, title }: { url: string; title: string }) {
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        toast.error('Tautan artikel tidak dapat dibagikan');
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Tautan artikel disalin');
    } catch {
      toast.error('Tautan artikel tidak dapat disalin');
    }
  }

  return (
    <Button
      aria-label="Bagikan artikel"
      className="gap-2"
      onClick={() => void share()}
      type="button"
      variant="ghost"
    >
      <Share2 aria-hidden="true" size={16} />
      <span className="sr-only sm:not-sr-only">Bagikan</span>
    </Button>
  );
}
