import YearSelectorClient from '@/components/gov/YearSelectorClient';

type YearOption = {
  key: string;
  label: string;
  year?: number | null;
};

export function BidangHeader({
  index,
  title,
  subtitle,
  yearLabel,
  lastUpdated,
  options,
  slug,
}: {
  index: string;
  title: string;
  subtitle: string;
  yearLabel: string;
  lastUpdated: string;
  options: YearOption[];
  slug: string;
}) {
  return (
    <header className="border-b border-paper-300 pb-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-gov-primary">BIDANG A{index}</p>
        <p className="font-mono text-xs text-ink-500">Pembaruan data terakhir: {lastUpdated}</p>
      </div>
      <h1 className="mt-3 max-w-4xl font-sans text-3xl font-bold leading-tight text-ink-900 sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-body text-ink-500">{subtitle}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">TAHUN</span>
        <YearSelectorClient
          options={options.map((option) => ({ key: option.key, label: option.label }))}
          defaultKey={yearLabel.toLocaleLowerCase('id-ID').startsWith('semua')
            ? 'all'
            : options.find((option) => option.key === yearLabel)?.key ?? options.find((option) => option.year !== null)?.key ?? 'all'}
        />
      </div>
    </header>
  );
}
