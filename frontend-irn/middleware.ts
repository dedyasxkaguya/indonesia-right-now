import { NextResponse, type NextRequest } from 'next/server';
import { SECRET_INTERNAL_ROOT, SECRET_INTERNAL_TRUTH, SECRET_ROOT, SECRET_TRUTH } from '@/lib/secret/routes';

const REWRITE_HEADER = 'x-irn-secret-rewrite';

/**
 * F21 — Next.js treats folders beginning with `_` as private, so the literal
 * `/__halaman-gelap` URLs are served by rewriting to an internal route.
 * Direct requests to the internal route are refused.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === SECRET_ROOT || pathname === SECRET_TRUTH) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === SECRET_ROOT ? SECRET_INTERNAL_ROOT : SECRET_INTERNAL_TRUTH;
    const headers = new Headers(request.headers);
    headers.set(REWRITE_HEADER, '1');
    return NextResponse.rewrite(url, { request: { headers } });
  }

  const isInternal = pathname === SECRET_INTERNAL_ROOT
    || pathname === SECRET_INTERNAL_TRUTH
    || pathname.startsWith(`${SECRET_INTERNAL_ROOT}/`);
  if (isInternal && request.headers.get(REWRITE_HEADER) !== '1') {
    return new NextResponse('Tidak ditemukan.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/__halaman-gelap', '/__halaman-gelap/truth', '/zona-gelap', '/zona-gelap/:path*'],
};
