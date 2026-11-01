import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const geoFiles = {
  provinces: 'provinces.geojson',
  kabkota: 'kabkota.geojson',
} as const;

export async function GET(_request: Request, { params }: { params: { kind: string } }) {
  if (!Object.hasOwn(geoFiles, params.kind)) {
    return NextResponse.json({ error: 'Berkas geospasial tidak dikenal.' }, { status: 404 });
  }
  const filename = geoFiles[params.kind as keyof typeof geoFiles];
  const filepath = path.join(process.cwd(), 'lib', 'data', 'geo', filename);
  try {
    const body = await readFile(filepath, 'utf8');
    return new NextResponse(body, {
      headers: {
        'content-type': 'application/geo+json; charset=utf-8',
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error(`[gov-geo] Gagal membaca ${filepath}`, error);
    return NextResponse.json({ error: 'Berkas batas wilayah tidak dapat dibaca.' }, { status: 500 });
  }
}
