import type { Metadata } from 'next';
import Link from 'next/link';
import { BidangHeader } from '@/components/gov/BidangHeader';
import { BidangTeasers } from '@/components/gov/BidangTeasers';
import { PanganCharts } from '@/components/gov/PanganCharts';
import { KpiStrip } from '@/components/gov/KpiStrip';
import { TrendAllYears } from '@/components/gov/TrendAllYears';
import { INSIGHT_TEASERS, buildPanganView } from '@/lib/gov/phase-b-views';
import { StateCard } from '@/components/ui/StateCard';
import { AdditionalTopicDatasets } from '@/components/igs/AdditionalTopicDatasets';

type SearchParams = { year?: string | string[] };

export function generateMetadata({ searchParams }: { searchParams: SearchParams }): Metadata {
  const view = buildPanganView(searchParams.year);
  const suffix = view.mode === 'all' ? ' Semua Tahun' : ` ${view.yearLabel}`;
  return {
    title: `Pangan${suffix}`,
    description: 'Produksi padi dan beras per kapita, produktivitas tertimbang, serta peringkat provinsi produksi pangan.',
  };
}

export default function PanganPage({ searchParams }: { searchParams: SearchParams }) {
  const view = buildPanganView(searchParams.year);
  const keyword = typeof searchParams.year === 'string' ? searchParams.year : null;
  if (keyword && !view.options.some((option) => option.key === keyword)) {
    return (
      <div className="space-y-6 py-8">
        <BidangHeader
          index="08"
          title="Pangan"
          subtitle="Produksi padi dan beras, produktivitas, dan provinsi surplus."
          yearLabel={keyword}
          lastUpdated={view.lastUpdated}
          options={view.options}
          slug="pangan"
        />
        <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Coba tahun lain atau kembali ke ringkasan.">
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-gov-primary">
            <Link href="/gov">Kembali ke Ringkasan</Link>
            <Link href="/gov/pangan?year=all">Lihat Semua Tahun</Link>
          </div>
        </StateCard>
      </div>
    );
  }

  const hasAnyData = view.kpis.some((cell) => cell.value !== 'Data belum tersedia') || view.totalsByYear.some((total) => total.padi !== null || total.beras !== null);
  return (
    <div className="space-y-8 py-8">
      <BidangHeader
        index="08"
        title="Pangan"
        subtitle="Produksi padi–beras per kapita, produktivitas tertimbang penduduk, dan distribusi produksi antarprovinsi dari dataset pertanian."
        yearLabel={view.yearLabel}
        lastUpdated={view.lastUpdated}
        options={view.options}
        slug="pangan"
      />
      {hasAnyData ? (
        <>
          <KpiStrip cells={view.kpis} />
          {view.mode === 'all' ? <TrendAllYears series={view.trends} slugLabel="Pangan" /> : null}
          <p className="text-xs text-ink-500">
            Grafik memakai tahun berdata {view.chartYear === null ? '' : view.chartYear}; peringkat provinsi menghitung produksi dibagi penduduk tahun yang sama.
          </p>
          <PanganCharts
            mode={view.mode}
            chartYear={view.chartYear}
            yearLabel={view.yearLabel}
            provinceRows={view.provinceRows}
            productivityRows={view.productivityRows}
            totalsByYear={view.totalsByYear}
          />
        </>
      ) : (
        <StateCard variant="empty" title="Data belum mencakup tahun ini" description="Dataset pertanian belum memuat baris produksi untuk tahun terpilih.">
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-gov-primary">
            <Link href="/gov">Kembali ke Ringkasan</Link>
            <Link href="/gov/pangan?year=all">Lihat Semua Tahun</Link>
          </div>
        </StateCard>
      )}
      <AdditionalTopicDatasets topic="pangan" />
      <BidangTeasers ids={INSIGHT_TEASERS.pangan} title="Pangan" />
    </div>
  );
}
