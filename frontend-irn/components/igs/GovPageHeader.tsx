export function GovPageHeader({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 border-b border-paper-300 pb-7">
      <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-gov-primary">BIDANG · {index}</p>
      <h1 className="mt-3 max-w-4xl font-sans text-3xl font-bold leading-tight text-ink-900 sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-body text-ink-500">{description}</p>
    </header>
  );
}
