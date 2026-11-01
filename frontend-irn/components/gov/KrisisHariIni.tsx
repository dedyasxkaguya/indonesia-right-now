import { BackendRequestError, getNews } from '@/lib/api/server';
import type { NewsItem } from '@/lib/types/api';
import provincesJson from '@/lib/data/provinces.json';
import bencanaJson from '@/lib/data/bencana.json';

type CrisisTag = 'banjir' | 'karhutla' | 'gempa' | 'longsor' | 'cuaca ekstrem';

const TAG_RULES: { tag: CrisisTag; label: string; keywords: string[] }[] = [
  { tag: 'banjir', label: 'Banjir', keywords: ['banjir'] },
  { tag: 'karhutla', label: 'Karhutla', keywords: ['karhutla', 'kebakaran hutan', 'kebakaran lahan', 'hutan dan lahan'] },
  { tag: 'gempa', label: 'Gempa', keywords: ['gempa', 'gersakan', 'magnitudo'] },
  { tag: 'longsor', label: 'Longsor', keywords: ['longsor'] },
  { tag: 'cuaca ekstrem', label: 'Cuaca ekstrem', keywords: ['cuaca ekstrem', 'hujan deras', 'hujan ekstrem', 'angin kencang', 'puting beliung', 'kekeringan'] },
];

/** Short news aliases not equal to the official province name. */
const PROVINCE_ALIASES: Record<string, string> = {
  'dki jakarta': 'jakarta',
  'di yogyakarta': 'yogyakarta',
  'kepulauan bangka belitung': 'bangka belitung',
  'kepulauan riau': 'kepulauan riau',
  'papua barat': 'papua barat',
};

type ProvinceMatch = { kode: string; name: string; tokens: string[] };

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function provinceMatcher(provinces: { kode: string; name: string }[]): ProvinceMatch[] {
  return provinces.map((province) => {
    const lower = province.name.toLowerCase();
    const tokens = [lower];
    const alias = PROVINCE_ALIASES[lower];
    if (alias) tokens.push(alias);
    return { ...province, tokens };
  });
}

function matchProvinces(item: NewsItem, matcher: ProvinceMatch[]): ProvinceMatch[] {
  const haystacks = [item.title, item.summary ?? '', item.content ?? ''].filter(Boolean);
  const found: ProvinceMatch[] = [];
  for (const province of matcher) {
    if (province.tokens.some((token) =>
      haystacks.some((text) => new RegExp(`(^|[^a-z\\u00C0-\\u024F])${escapeRegExp(token)}([^a-z\\u00C0-\\u024F]|$)`, 'i').test(text)),
    )) {
      found.push(province);
    }
  }
  return found;
}

function matchTags(item: NewsItem): { tag: CrisisTag; label: string }[] {
  const hay = `${item.title} ${item.summary ?? ''} ${(item.categories ?? []).join(' ')}`.toLowerCase();
  return TAG_RULES.filter((rule) => rule.keywords.some((keyword) => hay.includes(keyword)))
    .map((rule) => ({ tag: rule.tag, label: rule.label }));
}

function bencanaCounts2023(): Map<string, { kejadian: number; mengungsi: number }> {
  const map = new Map<string, { kejadian: number; mengungsi: number }>();
  const rows = (bencanaJson as { rows: Record<string, unknown>[] }).rows ?? [];
  for (const row of rows) {
    if (Number(row.tahun) !== 2023 || row.level !== 'provinsi') continue;
    const kode = String(row.kode_provinsi);
    const entry = map.get(kode) ?? { kejadian: 0, mengungsi: 0 };
    entry.kejadian += Number(row.jumlah_kejadian ?? 0);
    entry.mengungsi += Number(row.korban_menderita_mengungsi ?? 0);
    map.set(kode, entry);
  }
  return map;
}

export type CrisisCard = {
  item: NewsItem;
  tags: { tag: CrisisTag; label: string }[];
  provinces: { kode: string; name: string }[];
};

export async function collectCrisisCards(): Promise<{ cards: CrisisCard[]; error: boolean }> {
  try {
    const response = await getNews('?since=24h&max_items=150');
    const items: NewsItem[] = response.ok && response.data ? response.data.items : [];
    const matcher = provinceMatcher((provincesJson as { rows: { tingkat_pemerintahan: string; kode_wilayah: string; nama_daerah: string }[] }).rows
      .filter((row) => row.tingkat_pemerintahan === 'Provinsi')
      .map((row) => ({ kode: row.kode_wilayah, name: row.nama_daerah })));
    const cards: CrisisCard[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const tags = matchTags(item);
      if (!tags.length) continue;
      const matched = matchProvinces(item, matcher);
      if (!matched.length) continue;
      cards.push({ item, tags, provinces: matched.map((province) => ({ kode: province.kode, name: province.name })) });
    }
    return { cards, error: false };
  } catch (error) {
    if (error instanceof BackendRequestError) return { cards: [], error: true };
    return { cards: [], error: true };
  }
}

export async function KrisisHariIni() {
  const { cards, error } = await collectCrisisCards();
  if (error || !cards.length) return null; // service error or no match: hide panel entirely

  const counts = bencanaCounts2023();

  return (
    <section className="grid gap-5 lg:grid-cols-12" aria-label="Krisis hari ini">
      <div className="border border-paper-300 bg-paper-50 p-5 lg:col-span-4">
        <p className="font-mono text-eyebrow uppercase text-gov-primary">Krisis hari ini · 24 jam</p>
        <h2 className="mt-2 font-sans text-h3 text-ink-900">Bencana dalam berita terkini</h2>
        <p className="mt-3 text-sm leading-6 text-ink-500">
          Saring cepat laporan berita untuk banjir, karhutla, gempa, longsor, dan cuaca ekstrem, dipadukan dengan jumlah kejadian bencana tahun 2023 dari DIBI/BPS.
        </p>
        <dl className="mt-4 space-y-2">
          {TAG_RULES.map((rule) => {
            const count = cards.filter((card) => card.tags.some((tag) => tag.tag === rule.tag)).length;
            return (
              <div key={rule.tag} className="flex items-center justify-between border-t border-paper-200 pt-2">
                <dt className="text-sm text-ink-700">{rule.label}</dt>
                <dd className="font-mono text-sm font-semibold text-gov-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{count} berita</dd>
              </div>
            );
          })}
        </dl>
      </div>
      <div className="lg:col-span-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.slice(0, 6).map((card) => {
            const primary = card.provinces[0];
            const stat = primary ? counts.get(primary.kode) : undefined;
            return (
              <article key={card.item.id} className="flex flex-col border border-paper-300 bg-paper-50 p-4">
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag) => <span key={tag.tag} className="border border-gov-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-gov-primary">{tag.label}</span>)}
                </div>
                <h3 className="mt-2 line-clamp-3 font-sans text-sm font-semibold leading-6 text-ink-900">{card.item.title}</h3>
                <p className="mt-1 font-mono text-[10px] text-ink-500">
                  {card.item.publisher}{card.item.published_at ? ` · ${new Date(card.item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}
                </p>
                <p className="mt-2 flex-1 text-xs leading-5 text-ink-500">
                  {primary ? `${primary.name}` : ''}
                  {stat ? ` · ${new Intl.NumberFormat('id-ID').format(stat.kejadian)} kejadian bencana (2023)${stat.mengungsi ? `, ${new Intl.NumberFormat('id-ID').format(stat.mengungsi)} pengungsi` : ''}` : ' · data DIBI 2023 tidak mencakup provinsi ini'}
                </p>
                {card.provinces.length > 1 ? <p className="mt-1 text-[10px] text-ink-500">+{card.provinces.length - 1} provinsi lain disebut</p> : null}
                <a
                  href={card.item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gov-primary underline decoration-paper-300 underline-offset-4"
                >
                  Baca berita lengkap ↗
                </a>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-500">
          {cards.length > 6 ? `Menampilkan 6 dari ${cards.length} berita krisis teridentifikasi.` : 'Pasangan berita–provinsi dipilih dari kecocokan kata utuh, tanpa imputasi.'}
        </p>
      </div>
    </section>
  );
}
