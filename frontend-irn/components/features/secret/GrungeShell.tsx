import type { PropsWithChildren } from 'react';
import { CRTOverlay } from '@/components/features/secret/CRTOverlay';
import { GlitchText } from '@/components/features/secret/GlitchText';
import type { SecretPageMode } from '@/lib/types/secret';

type GrungeShellProps = PropsWithChildren<{
  mode: SecretPageMode;
  path: string;
  calm: boolean;
  eyebrow: string;
  title: string;
}>;

export function GrungeShell({ mode, path, calm, eyebrow, title, children }: GrungeShellProps) {
  return <div className={`secret-root relative min-h-screen overflow-hidden ${calm ? 'secret-calm' : ''}`}>
    <CRTOverlay />
    <div className="relative z-30 mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-10 sm:px-8 lg:px-10">
      <header className="border-b border-[#E8E5E0]/15 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#D32F2F]">
          <span>{eyebrow}</span>
          <span>{mode === 'truth' ? 'arsip nyata' : 'arsip simbolik'}</span>
        </div>
        <GlitchText className="mt-4 font-sans text-4xl font-bold tracking-tight text-[#E8E5E0] sm:text-5xl" text={title} />
      </header>
      <main className="flex-1 py-8">{children}</main>
      <footer className="border-t border-[#E8E5E0]/15 pt-4 font-mono text-[10px] leading-5 text-[#E8E5E0]/45">
        <p className="text-[#E8E5E0]/65">{path}</p>
        <p className="mt-1">Tidak diindeks. Tidak ditautkan dari navigasi. Tidak diiklankan.</p>
        {calm ? <p className="mt-1 text-[#D32F2F]">mode tenang aktif</p> : null}
      </footer>
    </div>
  </div>;
}
