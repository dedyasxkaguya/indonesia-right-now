'use client';

import { useCallback, useEffect, useState } from 'react';
import { Accessibility, X } from 'lucide-react';
import { toast } from 'sonner';

type Prefs = { fontScale: 100 | 112 | 125; contrast: boolean; reduceMotion: boolean };
type Theme = 'light' | 'dark';

const STORAGE_KEY = 'irn:a11y:v1';
const DEFAULT_PREFS: Prefs = { fontScale: 100, contrast: false, reduceMotion: false };

function applyPrefs(prefs: Prefs): void {
  const root = document.documentElement;
  root.style.fontSize = `${prefs.fontScale}%`;
  root.dataset.a11yContrast = String(prefs.contrast);
  root.dataset.a11yMotion = prefs.reduceMotion ? 'reduce' : 'default';
}

function readPrefs(): Prefs {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Prefs>;
    const merged = { ...DEFAULT_PREFS, ...stored };
    const calm = new URLSearchParams(window.location.search).get('calm') === '1';
    return calm ? { ...merged, reduceMotion: true, contrast: false } : merged;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** F18 — Accessibility panel (bottom-left floating control). */
export function A11yPanel() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [theme, setTheme] = useState<Theme>('light');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const initial = readPrefs();
    setPrefs(initial);
    applyPrefs(initial);
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const update = useCallback((next: Prefs) => {
    setPrefs(next);
    applyPrefs(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Optional preference. */ }
  }, []);

  const updateTheme = (next: Theme) => {
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      window.localStorage.setItem('irn:theme', next);
    } catch {
      toast.error('Preferensi tema tidak dapat disimpan.');
    }
  };

  const optionClass = (active: boolean) => `min-h-11 rounded-btn border px-3 py-1.5 font-mono text-[11px] transition-colors ${active ? 'border-brand-red bg-brand-red text-paper-50' : 'border-paper-300 bg-paper-50 text-ink-700 hover:bg-paper-200'}`;

  return <div className="fixed bottom-6 left-6 z-40 print:hidden">
    {open ? <div aria-label="Pengaturan aksesibilitas" className="w-72 border border-paper-300 bg-paper-50 p-4 shadow-lg" role="dialog">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">Aksesibilitas</p>
        <button aria-label="Tutup pengaturan aksesibilitas" className="inline-flex size-11 items-center justify-center rounded-full text-ink-400 hover:bg-paper-200 hover:text-ink-900" onClick={() => setOpen(false)} type="button"><X aria-hidden="true" className="size-4" /></button>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <p className="font-sans text-xs font-semibold text-ink-900">Tema Tampilan</p>
          <div className="mt-2 flex gap-2">
            {(['light', 'dark'] as const).map((value) => <button aria-pressed={theme === value} className={optionClass(theme === value)} key={value} onClick={() => updateTheme(value)} type="button">{value === 'light' ? 'Terang' : 'Gelap'}</button>)}
          </div>
        </div>
        <div>
          <p className="font-sans text-xs font-semibold text-ink-900">Ukuran huruf</p>
          <div className="mt-2 flex gap-2">
            {([100, 112, 125] as const).map((scale) => <button aria-pressed={prefs.fontScale === scale} className={optionClass(prefs.fontScale === scale)} key={scale} onClick={() => update({ ...prefs, fontScale: scale })} type="button">{scale}%</button>)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs font-semibold text-ink-900">Kontras tinggi</span>
          <button aria-label="Kontras tinggi" aria-pressed={prefs.contrast} className={optionClass(prefs.contrast)} onClick={() => update({ ...prefs, contrast: !prefs.contrast })} type="button">{prefs.contrast ? 'Aktif' : 'Mati'}</button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs font-semibold text-ink-900">Kurangi gerak</span>
          <button aria-label="Kurangi gerak" aria-pressed={prefs.reduceMotion} className={optionClass(prefs.reduceMotion)} onClick={() => update({ ...prefs, reduceMotion: !prefs.reduceMotion })} type="button">{prefs.reduceMotion ? 'Aktif' : 'Mati'}</button>
        </div>
      </div>
    </div> : null}
    <button
      aria-expanded={open}
      aria-label="Pengaturan aksesibilitas"
      className="mt-2 inline-flex size-11 items-center justify-center rounded-full border border-paper-300 bg-paper-50 text-ink-700 shadow-md transition-colors hover:border-brand-red hover:text-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
      onClick={() => setOpen((value) => !value)}
      type="button"
    >
      <Accessibility aria-hidden="true" className="size-5" />
    </button>
  </div>;
}
