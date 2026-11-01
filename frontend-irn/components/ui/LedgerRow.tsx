import Link from 'next/link';

type LedgerRowProps = { index: string; title: string; description: string; href: string; linkLabel?: string };

export function LedgerRow({ index, title, description, href, linkLabel = 'Selengkapnya' }: LedgerRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-paper-300 py-8 md:grid-cols-12 md:items-center md:gap-8">
      <div className="font-mono text-3xl tabular-nums text-ink-300 md:col-span-2">{index}</div>
      <div className="md:col-span-7">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <p className="mt-2 max-w-2xl text-body text-ink-500">{description}</p>
      </div>
      <Link className="font-sans text-sm font-semibold text-brand-red underline decoration-paper-300 underline-offset-4 hover:decoration-brand-red md:col-span-3 md:justify-self-end" href={href}>{linkLabel} <span aria-hidden="true">→</span></Link>
    </div>
  );
}
