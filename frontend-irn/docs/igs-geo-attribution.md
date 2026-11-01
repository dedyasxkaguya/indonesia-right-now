# Atribusi geospasial IGS

GeoJSON lokal pada `lib/data/geo/` dibangun oleh `scripts/build-geo.mjs`. Sumber dan commit dicatat di `lib/data/geo/manifest.json`; batas disederhanakan memakai `mapshaper -simplify 5% keep-shapes`.

- **Provinsi:** [ans-4175/peta-indonesia-geojson](https://github.com/ans-4175/peta-indonesia-geojson), commit `76057b332ff707dff8517b728a49bd9b7b52d471`, lisensi MIT. Sumber berisi 34 feature; kode provinsi CSV yang tidak memiliki geometri dicatat di manifest.
- **Kabupaten/kota:** [yusufsyaifudin/wilayah-indonesia](https://github.com/yusufsyaifudin/wilayah-indonesia), commit `54c4f4003292c39e5033ccc3b4df886bafa42046`, lisensi Open Database License (ODbL) v1.0. Dari 90 kode kabupaten/kota pada CSV, geometri cocok untuk 84; kode yang belum tersedia dicatat di manifest.

Peta hanya menampilkan geometri yang tersedia. Tabel fallback tetap mencakup semua wilayah pada data, termasuk yang tidak memiliki geometri. Sumber ini tidak diverifikasi sebagai batas administratif terbaru dan tidak mewakili seluruh 514 kabupaten/kota.
