'use client';

import React, { useState } from 'react';
import { Download, FileText, ImageIcon } from 'lucide-react';
import type { NewsData } from '@/lib/types/api';
import { exportCSV, exportPNG } from '@/lib/utils/export';
import { toast } from 'sonner';

interface ExportMenuProps {
  items: NewsData['items'];
  snapshotElementId?: string;
}

export function ExportMenu({ items, snapshotElementId = 'dashboard-feed' }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  function handleCSV() {
    try {
      exportCSV(items);
      toast.success('CSV diunduh');
    } catch {
      toast.error('Gagal mengekspor CSV');
    }
    setOpen(false);
  }

  async function handlePNG() {
    toast.promise(exportPNG(snapshotElementId), {
      loading: 'Membuat tangkapan layar…',
      success: 'PNG diunduh',
      error: 'Gagal mengekspor PNG',
    });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Ekspor data"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-btn border border-paper-300 bg-paper-50 px-3 py-2 font-mono text-[11px] text-ink-700 transition-colors hover:border-ink-400 hover:bg-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Download aria-hidden="true" className="size-3.5" />
        Ekspor
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[180px] border border-paper-300 bg-paper-50 py-1 shadow-md"
            role="menu"
          >
            <button
              className="flex w-full items-center gap-2.5 px-4 py-2.5 font-mono text-xs text-ink-700 transition-colors hover:bg-paper-100 hover:text-ink-900"
              onClick={handleCSV}
              role="menuitem"
              type="button"
            >
              <FileText aria-hidden="true" className="size-3.5 shrink-0" />
              Unduh CSV
            </button>
            <button
              className="hidden w-full items-center gap-2.5 px-4 py-2.5 font-mono text-xs text-ink-700 transition-colors hover:bg-paper-100 hover:text-ink-900 sm:flex"
              onClick={handlePNG}
              role="menuitem"
              type="button"
            >
              <ImageIcon aria-hidden="true" className="size-3.5 shrink-0" />
              Unduh PNG
            </button>
          </div>
        </>
      )}
    </div>
  );
}
