import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type TeaserMeta = { title: string; hint: string };

export const INSIGHT_TEASER_META: Record<string, TeaserMeta> = {
  'road-vs-capital-spending': {
    title: 'Jalan bagus, uangnya ke mana?',
    hint: 'Rasio belanja modal APBD disandingkan dengan kesenjangan mantap jalan pusat–daerah.',
  },
  'electricity-vs-poverty': {
    title: 'Listrik 99%, miskin masih',
    hint: 'Elektrifikasi hampir di mana-mana, tetapi tingkat kemiskinan belum mengikuti.',
  },
  'waste-vs-welfare': {
    title: 'TPA kewalahan, IPM tertahan',
    hint: 'Jumlah TPA overcapacity pada provinsi dibandingkan dengan indeks pembangunan manusia.',
  },
  'disaster-vs-poverty': {
    title: 'Bencana memukul yang lemah',
    hint: 'Indeks paparan bencana dibandingkan dengan tingkat kemiskinan provinsi.',
  },
  'growth-vs-welfare': {
    title: 'Tumbuh, tapi belum sejahtera',
    hint: 'PDRB per kapita disandingkan dengan IPM dalam satu kuadran.',
  },
};

export function BidangTeasers({ ids, title }: { ids: string[]; title: string }) {
  const teasers = ids
    .map((id) => ({ id, meta: INSIGHT_TEASER_META[id] }))
    .filter((teaser): teaser is { id: string; meta: TeaserMeta } => Boolean(teaser.meta));
  if (!teasers.length) return null;
  return (
    <section className="border-t border-paper-300 pt-8">
      <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-ink-500">LENSA DATA · {title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">Dua pembacaan lintas dataset dari bidang ini. Halaman lengkapnya menyajikan grafik penuh beserta penjelasan metriknya.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teasers.map((teaser) => (
          <Link
            key={teaser.id}
            href={`/gov/insight/${teaser.id}`}
            className="group flex flex-col border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gov-primary"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gov-primary">Insight</p>
            <p className="mt-2 font-sans text-lg font-semibold text-ink-900 group-hover:underline">{teaser.meta.title}</p>
            <p className="mt-2 flex-1 text-sm leading-6 text-ink-500">{teaser.meta.hint}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gov-primary">
              Baca insight <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
