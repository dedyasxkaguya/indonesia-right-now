# DEVELOPER GUIDE

## Prasyarat & Setup Lokal
1. **Node.js** `>=20` (cek dengan `node -v`).
2. **pnpm** `>=9` – paket manager yang dipakai proyek (`pnpm -v`).
3. **.env.local** – buat file di root dengan minimal variabel berikut:
   ```
   BACKEND_URL=https://api.example.com   # opsional, untuk endpoint eksternal
   GROQ_API_KEY=xxxxxxxxxxxxxxxxxxxx   # kunci LLM (tidak disertakan di repo)
   ```
   Semua variabel lain memiliki nilai default dalam kode.

## Instalasi & Jalankan
```bash
pnpm install          # mengunduh semua dependencies
pnpm dev              # menjalankan `next dev` pada http://localhost:3000
```
- Server akan otomatis menjalankan `scripts/build-data.mjs` (pre‑build) sebelum build pertama.
- Untuk melihat hasil produksi lokal: `pnpm build && pnpm start`.

## Menambah Dataset Baru
1. **Tempatkan CSV** baru di folder `datasets/` (mis. `dataset_nama_baru_2020_2025.csv`).
2. **Update `scripts/build-data.mjs`**:
   - Tambahkan entri ke array `sources` atau `phaseBSources` sesuai kategori (ekonomi, sosial, dll).
   - Set `source` string deskriptif yang akan muncul di `sumber_data`.
3. **Jika dataset memerlukan normalisasi khusus** (mis. level kab/kota), buat fungsi serupa `normalizeWasteDataset` di file yang sama.
4. **Jalankan ulang pipeline**:
   ```bash
   pnpm prebuild   # mengeksekusi `node scripts/build-data.mjs`
   pnpm dev        # atau `pnpm build` untuk memeriksa hasil
   ```
   File JSON baru akan muncul di `lib/data/` dengan nama yang sama (tanpa ekstensi).

## Testing
- **Vitest** digunakan untuk unit test (formatter angka, agregasi populasi, tipe data).
- Jalankan semua tes:
  ```bash
  pnpm test
  ```
- Saat menambah fitur atau dataset baru, tambahkan tes yang relevan di folder `test/`.

## API Contract (Ringkas)
| Route | Metode | Deskripsi | Contoh Response |
|------|--------|-----------|-----------------|
| `/api/news` | `POST` | Terima URL artikel, kembalikan rangkuman bersih (AI). | `{ summary: "...", source: "..." }` |
| `/api/fetch` | `GET` | Proxy generic fetch ke `BACKEND_URL` (opsional). | `{ data: … }` |
| `/api/gov-geo/[kind]` | `GET` | Mengembalikan GeoJSON untuk jenis geografi (`province`, `kabkota`). | `{ type: "FeatureCollection", features: […] }` |

## Pengembangan Lokal Lanjutan
- **Hot‑module replacement** otomatis lewat `next dev`.
- **Lint & Typecheck** selalu dijalankan sebelum commit:
  ```bash
  pnpm lint && pnpm typecheck
  ```
- **Debug AI Cleansing**: Edit prompt di `app/api/news/route.ts` bila diperlukan; pastikan kembali menjalankan `pnpm dev`.

---

*Ikuti standar anti‑slop (font, warna, `tabular‑nums`) pada setiap UI baru.*