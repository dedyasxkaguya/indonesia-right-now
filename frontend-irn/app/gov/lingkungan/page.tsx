import type { Metadata } from 'next';
import Link from 'next/link';
import { BidangHeader } from '@/components/gov/BidangHeader';
import { BidangTeasers } from '@/components/gov/BidangTeasers';
import { LingkunganCharts } from '@/components/gov/LingkunganCharts';
import { KpiStrip } from '@/components/gov/KpiStrip';
import { TrendAllYears } from '@/components/gov/TrendAllYears';
import { INSIGHT_TEASERS, buildLingkunganView } from '@/lib/gov/phase-b-views';
import { StateCard } from '@/components/ui/StateCard';
import { AdditionalTopicDatasets } from '@/components/igs/AdditionalTopicDatasets';

type SearchParams = { year?: string | string[] };

export function generateMetadata({ searchParams }: { searchParams: SearchParams }): Metadata {
  const view = buildLingkunganView(searchParams.year);
  const suffix = view.mode === 'all' ? ' Semua Tahun' : ` ${view.yearLabel}`;
  return {
    title: `Lingkungan${suffix}`,
    description: 'Paparan bencana, kapasitas TPA, dan pengurangan kawasan kumuh dari data BNPB, SIPSN, dan PUPR.',
  };
}

export default function LingkunganPage({ searchParams }: { searchParams: SearchParams }) {
  const view = buildLingkunganView(searchParams.year);
  const keyword = typeof searchParams.year === 'string' ? searchParams.year : null;
  if (keyword && !view.options.some((option) => option.key === keyword)) {
    return (
      <div className="space-y-6 py-8">
        <BidangHeader
          index="07"
          title="Lingkungan"
          subtitle="Paparan bencana, kapasitas TPA, dan mitigasi kawasan kumuh."
          yearLabel={keyword}
          lastUpdated={view.lastUpdated}
          options={view.options}
          slug="lingkungan"
        />
        <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Coba tahun lain atau kembali ke ringkasan.">
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-gov-primary">
            <Link href="/gov">Kembali ke Ringkasan</Link>
            <Link href="/gov/lingkungan?year=all">Lihat Semua Tahun</Link>
          </div>
        </StateCard>
      </div>
    );
  }

  const hasAnyData = view.kpis.some((cell) => cell.value !== 'Data belum tersedia') || view.typeYearEvents.some((row) => row.events > 0);
  return (
    <div className="space-y-8 py-8">
      <BidangHeader
        index="07"
        title="Lingkungan"
        subtitle="Paparan bencana, kapasitas TPA, dan pengurangan kawasan kumuh dari dataset bencana, TPA, serta kumuh."
        yearLabel={view.yearLabel}
        lastUpdated={view.lastUpdated}
        options={view.options}
        slug="lingkungan"
      />
      {hasAnyData ? (
        <>
          <KpiStrip cells={view.kpis} />
          {view.mode === 'all' ? <TrendAllYears series={view.trends} slugLabel="Lingkungan" /> : null}
          <p className="text-xs text-ink-500">
            Grafik tahunan memakai tahun berdata {view.chartYear === null ? 'terkini' : view.chartYear}; peta titik TPA memakai tahun yang sama. Mode &ldquo;Semua Tahun&rdquo; menambah ringkasan lintas tahun.
          </p>
          <LingkunganCharts
            mode={view.mode}
            chartYear={view.chartYear}
            yearLabel={view.yearLabel}
            facilities={view.facilities}
            typeYearEvents={view.typeYearEvents}
            jenisList={view.jenisList}
            heatRows={view.heatRows}
          />
        </>
      ) : (
        <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Dataset lingkungan belum memuat baris untuk tahun terpilih.">
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-gov-primary">
            <Link href="/gov">Kembali ke Ringkasan</Link>
            <Link href="/gov/lingkungan?year=all">Lihat Semua Tahun</Link>
          </div>
        </StateCard>
      )}
      <AdditionalTopicDatasets topic="lingkungan" />
      <BidangTeasers ids={INSIGHT_TEASERS.lingkungan} title="Lingkungan" />
    </div>
  );
}
