import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InsightChart } from '@/components/gov/InsightChart';
import { CROSS_INSIGHTS, CROSS_INSIGHT_YEAR, getInsight } from '@/lib/gov/cross-insights';

type Params = { id: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return CROSS_INSIGHTS.map((insight) => ({ id: insight.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const insight = getInsight(params.id);
  return {
    title: insight ? `${insight.title} · Lensa Data` : 'Lensa Data',
    description: insight?.description,
  };
}

const BIDANG_OF_INSIGHT: Record<string, { slug: string; label: string }> = {
  'road-vs-capital-spending': { slug: 'infrastruktur', label: 'Infrastruktur' },
  'electricity-vs-poverty': { slug: 'infrastruktur', label: 'Infrastruktur' },
  'waste-vs-welfare': { slug: 'lingkungan', label: 'Lingkungan' },
  'disaster-vs-poverty': { slug: 'lingkungan', label: 'Lingkungan' },
  'growth-vs-welfare': { slug: 'pangan', label: 'Pangan & kemakmuran' },
  'fiscal-vs-poverty': { slug: 'daerah', label: 'Daerah' },
  'spending-vs-service': { slug: 'pemerintahan', label: 'Pemerintahan' },
  'transparency-vs-value': { slug: 'pemerintahan', label: 'Pemerintahan' },
  'spbe-vs-spm': { slug: 'pemerintahan', label: 'Pemerintahan' },
};

export default function InsightPage({ params }: { params: Params }) {
  const insight = getInsight(params.id);
  if (!insight) notFound();
  const related = BIDANG_OF_INSIGHT[insight.id];
  const hasChart = insight.data.rows.length > 0;

  return (
    <div className="space-y-8 py-8">
      <header className="border-b border-paper-300 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-gov-primary">LENSA DATA · TAHUN {CROSS_INSIGHT_YEAR}</p>
        <h1 className="mt-3 max-w-3xl font-sans text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">{insight.title}</h1>
        <p className="mt-3 max-w-2xl text-body text-ink-500">{insight.description}</p>
      </header>

      {hasChart ? (
        <InsightChart insight={insight} />
      ) : (
        <div className="border border-dashed border-paper-300 bg-paper-50 p-6">
          <h2 className="font-sans text-h3 text-ink-900">Data belum tersedia</h2>
          <p className="mt-2 text-body text-ink-500">Tidak ada pasangan provinsi dengan kedua metrik lengkap pada tahun {CROSS_INSIGHT_YEAR}; grafik tidak dibuat tanpa data.</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="border border-paper-300 bg-paper-50 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gov-primary">Metrik 1 (sumbu horizontal)</p>
          <p className="mt-2 font-sans text-sm font-semibold text-ink-900">{insight.metric_a.label}</p>
          <p className="mt-1 font-mono text-xs text-ink-500">{insight.metric_a.source}</p>
        </article>
        <article className="border border-paper-300 bg-paper-50 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gov-primary">Metrik 2 (sumbu vertikal)</p>
          <p className="mt-2 font-sans text-sm font-semibold text-ink-900">{insight.metric_b.label}</p>
          <p className="mt-1 font-mono text-xs text-ink-500">{insight.metric_b.source}</p>
        </article>
      </section>

      {insight.chart === 'scatter-quadrant' && insight.quadrant_labels ? (
        <section className="border border-paper-300 bg-paper-50 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gov-primary">Cara membaca kuadran</p>
          <ul className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
            <li><strong className="text-ink-900">Atas–kanan:</strong> {insight.quadrant_labels.tr}</li>
            <li><strong className="text-ink-900">Atas–kiri:</strong> {insight.quadrant_labels.tl}</li>
            <li><strong className="text-ink-900">Bawah–kiri:</strong> {insight.quadrant_labels.bl}</li>
            <li><strong className="text-ink-900">Bawah–kanan:</strong> <span className="text-amber-700">{insight.quadrant_labels.br}</span></li>
          </ul>
          <p className="mt-3 text-xs text-ink-500">Batas kuadran memakai median provinsi yang memiliki kedua nilai; tidak ada provinsi yang diimputasi atau dikeluarkan dari pembacaan tanpa alasan data.</p>
        </section>
      ) : null}

      {insight.chart === 'bubble' ? (
        <section className="border border-paper-300 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gov-primary">Cara membaca gelembung</p>
          <p className="mt-2">Posisi gelembung: horizontal = {insight.metric_b.label.toLowerCase()}, vertikal = {insight.metric_a.label.toLowerCase()}. Ukuran lingkaran memakai skala eksplisit terhadap jumlah TPA overcapacity; legend ukuran disajikan pada tabel data.</p>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center gap-6 border-t border-paper-300 pt-6">
        <Link href="/gov" className="text-sm font-semibold text-gov-primary underline decoration-paper-300 underline-offset-4">
          Kembali ke Lensa Data
        </Link>
        {related ? (
          <>
            <Link href="/gov" className="text-sm text-ink-500">Semua insight lintas dataset</Link>
            <Link href={`/gov/${related.slug}`} className="text-sm font-semibold text-gov-primary">
              Bidang {related.label} →
            </Link>
          </>
        ) : null}
      </footer>
    </div>
  );
}
