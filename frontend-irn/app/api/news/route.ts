import { NextRequest, NextResponse } from 'next/server';
import { BackendRequestError, getNews, postNews } from '@/lib/api/server';
import { canonicalizeNewsQuery, isGovernmentSourceUrl } from '@/lib/api/news-query';

export const runtime = 'nodejs';

type NewsSourceRequest = { name: string; url: string };

function governmentSourcesDisabled() {
  return NextResponse.json({
    ok: false,
    data: null,
    error: {
      code: 'GOVERNMENT_SOURCES_DISABLED',
      message: 'Sumber berita pemerintah tidak tersedia pada layanan ini.',
    },
  }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const requestedSources = request.nextUrl.searchParams.getAll('sources').flatMap((value) => value.split(','));
  if (requestedSources.some((source) => isGovernmentSourceUrl(source.trim()))) {
    return governmentSourcesDisabled();
  }
  const query = canonicalizeNewsQuery(request.nextUrl.searchParams);

  try {
    const result = await getNews(query.toString());
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ ok: false, data: null, error: { code: error.code, message: error.message } }, { status: error.status });
    }
    return NextResponse.json({ ok: false, data: null, error: { code: 'BACKEND_OFFLINE', message: 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.' } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      sources?: NewsSourceRequest[];
      since?: string;
      max_items?: number;
      category?: string[];
      publisher?: string[];
      keyword?: string[];
      exclude?: string[];
    };
    if (body.sources?.some((source) => isGovernmentSourceUrl(source.url))) {
      return governmentSourcesDisabled();
    }

    const result = await postNews({
      sources: body.sources,
      since: body.since,
      max_items: body.max_items,
      category: body.category,
      publisher: body.publisher,
      keyword: body.keyword,
      exclude: body.exclude,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ ok: false, data: null, error: { code: error.code, message: error.message } }, { status: error.status });
    }
    return NextResponse.json({ ok: false, data: null, error: { code: 'BACKEND_OFFLINE', message: 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.' } }, { status: 503 });
  }
}
