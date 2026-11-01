'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

const shortcuts = [
  ['⌘K / Ctrl+K', 'Toggle command palette'],
  ['?', 'Open this cheatsheet'],
  ['Esc', 'Close the topmost panel'],
  ['g, then h', 'Go to home'],
  ['g, then d', 'Go to dashboard'],
  ['g, then a', 'Go to analytics'],
  ['g, then u', 'Go to URL analysis'],
  ['g, then t', 'Go to saved articles'],
  ['g, then i', 'Go to today’s front page'],
  ['g, then n', 'Go to research notebook'],
  ['g, then b', 'Go to publisher comparison'],
  ['j / k', 'Focus next / previous feed item'],
  ['Enter', 'Open the focused item in Reader'],
  ['b', 'Bookmark the focused item'],
  ['/', 'Focus dashboard search'],
];

type ShortcutsCheatsheetProps = { open: boolean; onOpenChange: (open: boolean) => void };

export function ShortcutsCheatsheet({ open, onOpenChange }: ShortcutsCheatsheetProps) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-ink-900/35" />
      <Dialog.Content className="fixed left-1/2 top-[8vh] z-[101] max-h-[84vh] w-[min(48rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto border border-paper-300 bg-paper-100 p-5 shadow-xl focus:outline-none sm:p-8">
        <header className="flex items-start justify-between gap-4 border-b border-paper-300 pb-5">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-red">Keyboard reference</p><Dialog.Title className="mt-2 font-sans text-h2 text-ink-900">Keyboard shortcuts</Dialog.Title><Dialog.Description className="mt-2 text-sm text-ink-500">Navigation and article actions.</Dialog.Description></div>
          <Dialog.Close aria-label="Close shortcuts" className="inline-flex size-9 items-center justify-center rounded-btn text-ink-500 hover:bg-paper-200"><X aria-hidden="true" className="size-4" /></Dialog.Close>
        </header>
        <dl className="mt-5 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {shortcuts.map(([keys, description]) => <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-paper-300 py-3" key={keys}>
            <dt className="flex flex-wrap gap-1">{keys.split(' / ').flatMap((key, index) => index ? [<span aria-hidden="true" className="self-center font-mono text-[10px] text-ink-400" key={`sep-${index}`}>/</span>, <kbd className="rounded-pill border border-paper-300 bg-paper-50 px-2 py-1 font-mono text-[10px] text-ink-700" key={key}>{key}</kbd>] : [<kbd className="rounded-pill border border-paper-300 bg-paper-50 px-2 py-1 font-mono text-[10px] text-ink-700" key={key}>{key}</kbd>])}</dt>
            <dd className="text-xs leading-5 text-ink-600">{description}</dd>
          </div>)}
        </dl>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
