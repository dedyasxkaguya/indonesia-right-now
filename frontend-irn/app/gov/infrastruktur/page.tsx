import type { Metadata } from 'next';
import Link from 'next/link';
import { BidangHeader } from '@/components/gov/BidangHeader';
import { BidangTeasers } from '@/components/gov/BidangTeasers';
import { InfrastrukturCharts } from '@/components/gov/InfrastrukturCharts';
import { KpiStrip } from '@/components/gov/KpiStrip';
import { TrendAllYears } from '@/components/gov/TrendAllYears';
import { INSIGHT_TEASERS, buildInfrastrukturView } from '@/lib/gov/phase-b-views';
import { StateCard } from '@/components/ui/StateCard';
import { AdditionalTopicDatasets } from '@/components/igs/AdditionalTopicDatasets';
import { provinces } from '@/lib/data';

type SearchParams = { year?: string | string[] };

export function generateMetadata({ searchParams }: { searchParams: SearchParams }): Metadata {
  const view = buildInfrastrukturView(searchParams.year);
  const suffix = view.mode === 'all' ? ' Semua Tahun' : ` ${view.yearLabel}`;
  return {
    title: `Infrastruktur${suffix}`,
    description: 'Akses layanan dasar, kemantapan jalan menurut kewenangan, pengurangan kawasan kumuh, dan elektrifikasi terhadap ambang provinsi.',
  };
}

export default function InfrastrukturPage({ searchParams }: { searchParams: SearchParams }) {
  const view = buildInfrastrukturView(searchParams.year);
  const keyword = typeof searchParams.year === 'string' ? searchParams.year : null;
  if (keyword && !view.options.some((option) => option.key === keyword)) {
    return (
      <div className="space-y-6 py-8">
        <BidangHeader
          index="06"
          title="Infrastruktur"
          subtitle="Akses layanan dasar, kesenjangan jalan pusat–daerah, dan pengurangan kawasan kumuh."
          yearLabel={keyword}
          lastUpdated={view.lastUpdated}
          options={view.options}
          slug="infrastruktur"
        />
        <StateCard
          variant="empty"
          title="Data belum mencakup tahun ini"
          description="Coba tahun lain atau kembali ke ringkasan."
        >
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-gov-primary">
            <Link href="/gov">Kembali ke Ringkasan</Link>
            <Link href="/gov/infrastruktur?year=all">Lihat Semua Tahun</Link>
          </div>
        </StateCard>
      </div>
    );
  }

  const hasAnyData = view.kpis.some((cell) => cell.value !== 'Data belum tersedia') || view.trends.some((trend) => trend.points.some((point) => point.value !== null));
  return (
    <div className="space-y-8 py-8">
      <BidangHeader
        index="06"
        title="Infrastruktur"
        subtitle="Akses layanan dasar, kesenjangan jalan pusat–daerah, dan pengurangan kawasan kumuh dari dataset elektrifikasi, air minum–sanitasi, kemantapan jalan, serta kawasan kumuh."
        yearLabel={view.yearLabel}
        lastUpdated={view.lastUpdated}
        options={view.options}
        slug="infrastruktur"
      />
      {hasAnyData ? (
        <>
          <KpiStrip cells={view.kpis} />
          {view.mode === 'all' ? <TrendAllYears series={view.trends} slugLabel="Infrastruktur" /> : null}
          <p className="text-xs text-ink-500">
            Grafik pada mode tahun menampilkan tahun berdata lengkap terkini: {view.chartYear === null ? 'belum ada' : view.chartYear}. Mode &ldquo;Semua Tahun&rdquo; menambah ringkasan lintas tahun di atas.
          </p>
          <InfrastrukturCharts
            mode={view.mode}
            chartYear={view.chartYear}
            yearLabel={view.yearLabel}
            regions={provinces}
            stackingPerProvince={view.stackingPerProvince}
            authorityYears={view.authorityYears}
            radarRows={view.radarRows}
            bulletRows={view.bulletRows}
            rerataElektrifikasi={view.rerataElektrifikasi}
            gapRows={view.gapRows}
          />
        </>
      ) : (
        <StateCard
          variant="empty"
          title="Data belum mencakup tahun ini"
          description="Dataset infrastruktur belum memuat baris lengkap untuk tahun terpilih."
        >
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-gov-primary">
            <Link href="/gov">Kembali ke Ringkasan</Link>
            <Link href="/gov/infrastruktur?year=all">Lihat Semua Tahun</Link>
          </div>
        </StateCard>
      )}
      <AdditionalTopicDatasets topic="infrastruktur" />
      <BidangTeasers ids={INSIGHT_TEASERS.infrastruktur} title="Infrastruktur" />
    </div>
  );
}
