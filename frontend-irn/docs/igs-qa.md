# Daftar QA IGS

## Terverifikasi secara otomatis pada implementasi

- [x] Data dihasilkan dari 39 CSV lokal tanpa fetch CSV runtime: enam sumber inti, delapan Phase B, dan 25 sumber tambahan.
- [x] Parser mengubah angka menjadi numerik dan nilai kosong menjadi `null`; kesalahan CSV/schema tidak disamarkan.
- [x] 25 sumber tambahan memakai registry skema eksplisit; agregat provinsi/tahun/kategori tidak meneruskan identifier record-level.
- [x] Grup sumber tambahan dengan kurang dari lima catatan disembunyikan; cakupan parsial dan snapshot tanpa tahun tetap dicatat.
- [x] Output gabungan besar dipecah per tingkat wilayah dan rentang tahun.
- [x] 38 provinsi dan 90 kabupaten/kota yang tersedia menghasilkan parameter statis.
- [x] Metrik kemandirian fiskal diuji terhadap kolom realisasi APBD; missing metric tidak menjadi nol.
- [x] Route `/gov` dan rute anak menggunakan mode berdasarkan pathname; tidak ada penyimpanan mode.
- [x] Year query selector menggunakan `?tahun=YYYY`, default 2025; stepper mencakup 2020–2026. Data inti berakhir pada 2025, sebagian data tambahan mencakup 2026.
- [x] GeoJSON lokal dihasilkan dengan simplifikasi 5% dan mencatat commit sumber, lisensi, serta coverage.
- [x] Peta hanya didaftarkan pada client sebelum ECharts menggambar; kegagalan berkas geometri diumumkan.
- [x] Setiap chart memiliki nama/deskripsi aksesibel dan tabel data fallback.

## Inventaris visualisasi

| Halaman | Chart type yang harus hadir | Pemeriksaan |
|---|---|---|
| `/gov/pemerintahan` | Radar; parallel coordinates; sunburst | [x] Profil governance, data paralel, dan hierarki indikator tata kelola/APBD |
| `/gov/ekonomi` | Treemap; waterfall | [x] Sektor dominan dan perubahan realisasi modal |
| `/gov/pendidikan` | Heatmap; ridgeline; violin | [x] Gedung layak × tahun, distribusi gedung per pulau, dan rasio guru-murid |
| `/gov/sosial-publik` | Choropleth; boxplot; Venn | [x] Peta IPM, sebaran IPM per pulau, irisan ambang median |
| `/gov/daerah` | Choropleth; Sankey; network; chord | [x] Efisiensi pengadaan, rantai nominal, jejaring wilayah-sektor, relasi provinsi-rekanan |
| `/gov/analytics` | Correlation heatmap; scatter; gauge | [x] Pearson r, sebaran pasangan metrik, kualitas pipeline AI, delapan pandangan lintas dataset |
| `/gov/provinsi/[kode]` | Choropleth; line; scatter | [x] Wilayah aktif disorot pada peta peer |

### Empat chart type tambahan

| Chart type | Halaman | Presence | Bukti |
|---|---|---|---|
| Sunburst | `/gov/pemerintahan` | YES | `components/igs/GovTopicInventory.tsx`; tabel 190 observasi pada browser |
| Chord (ECharts graph melingkar) | `/gov/daerah` | YES | `components/igs/GovTopicInventory.tsx`; tabel relasi provinsi-rekanan |
| Gauge | `/gov/analytics` | YES | `components/igs/FetchQualityGauges.tsx`; tabel tiga metrik |
| Violin | `/gov/pendidikan` | YES | `components/igs/GovTopicInventory.tsx`; KDE enam pulau/kawasan |

Gauge membaca snapshot `/fetch` sesi browser. Jika snapshot tidak tersedia, gauge menampilkan tanda belum tersedia dan tidak memakai angka contoh.

## Chart type notes

- **Grouped bar** tidak dibuat terpisah karena perbandingan beberapa seri dapat ditampilkan sebagai beberapa bar pada chart bar yang sudah ada.
- **Stacked bar** tidak dibuat terpisah karena stacking adalah konfigurasi seri pada chart bar yang sudah ada, bukan kebutuhan visualisasi baru.
- **Horizontal bar** tidak dibuat terpisah karena orientasi sumbu dapat diubah pada chart bar yang sudah ada.
- **Sparkline** tidak dibuat terpisah karena merupakan variasi ringkas chart line yang sudah ada.

### Pandangan lintas dataset

Delapan view dari `lib/data/derived/cross-dataset.json` ditampilkan di `/gov/analytics` melalui `components/igs/CrossDatasetViews.tsx`; setiap kartu memiliki tabel fallback. Pemeriksaan browser menemukan bagian dan tabelnya, sedangkan HTTP produksi untuk route analytics berstatus 200.

## Scene temporal

- [x] `/gov` hero dan `/gov/dashboard` row pertama memuat scene kepulauan; bubble memilih provinsi dan hover menampilkan nilai.
- [x] `/gov/analytics` memuat lintasan tiga dimensi provinsi 2020–2025 dengan jejak indikator.
- [x] Year slider persisten mengubah `?tahun=` dengan RAF throttle; scene hero memiliki slider waktu dan toggle putar otomatis.
- [x] Canvas scene lazy-loaded, memakai DPR 1–1.75, `frameloop="demand"`, dan berhenti saat tab/window tidak aktif.
- [x] Reduced motion, perangkat `deviceMemory < 4`, atau WebGL tidak tersedia memakai fallback SVG statis yang tetap memiliki tabel/link.

Chart dan tabel menggunakan nilai sumber/hasil turunan yang tersedia. Diagram Venn adalah SVG lokal karena paket `@visx/venn` tidak tersedia pada registry saat implementasi; ukuran lingkaran tidak menyatakan proporsi.

## Pemeriksaan browser iterasi 2B

- [x] `/gov`, `/gov/dashboard`, dan `/gov/analytics` merender scene dan tabel fallback di browser desktop.
- [x] Putar otomatis mengubah tahun scene dan query; slider persisten mengubah `?tahun=` melalui keyboard.
- [x] Reduced-motion dan simulasi `deviceMemory = 2` menampilkan fallback SVG, bukan canvas WebGL.
- [x] Viewport 375 px: halaman tidak melebar horizontal, indeks bagian tersembunyi, drawer membuka tab IRN/IGS.
- [ ] Tanda tangan UAT manusia dan pembaca layar: menunggu pemeriksaan manual.

## Perlu UAT browser sebelum rilis

- [ ] Navigasi `/` → `/gov` → `/` dan favicon aktual di browser.
- [x] Server produksi: 12 route IGS yang diminta dan `/` merespons HTTP 200 pada 2026-10-31.
- [ ] Perubahan tahun memperbarui semua chart dan URL pada perangkat seluler.
- [ ] Pembaca layar mengumumkan chart dan tabel fallback dengan urutan yang tepat.
- [ ] Kontras, drawer seluler, tab mode, dan keyboard-only navigation.
- [x] Spot-check sepuluh nilai agregat dari sepuluh CSV tambahan; rincian QA tercatat di bawah.
- [ ] Lighthouse tiap halaman Gov Stats (target performance ≥ 90, accessibility 100).
- [ ] Periksa ukuran JS terkompresi halaman `/gov` pada build produksi.

## QA integrasi dataset tambahan

- [x] 25 registry sumber menghasilkan 5.087 grup agregat dari 12/24/29/38 provinsi; sumber tanpa tahun tetap menjadi snapshot.
- [x] Pemeriksaan key seluruh 5.087 baris agregat menemukan nol kolom identifier terlarang.
- [x] Sepuluh nilai agregat (jumlah dan rerata) dicocokkan ulang dengan perhitungan independen dari sepuluh CSV sumber; pemeriksaan hanya melaporkan lulus/gagal, bukan record sumber.
- [x] Route produksi `/gov`, `/gov/pendidikan`, `/gov/infrastruktur`, `/gov/lingkungan`, `/gov/pangan`, dan `/gov/ekonomi` merespons HTTP 200.
- [x] Pada viewport 375 px di `/gov/pendidikan?tahun=2026` dan `/gov/infrastruktur?year=2023`, tidak ada overflow horizontal; memilih pulau Jawa membatasi provinsi ke enam provinsi dan mengubah radar Infrastruktur ke agregat berbobot populasi.
- [x] Radar Infrastruktur default ke Agregat Nasional; indikator yang tidak lengkap tetap kosong dan tidak diisi dengan nol.
- [x] Kartu dataset baru menampilkan deskripsi sumber, satuan indikator, tahun, wilayah terpilih, dan penjelasan aturan ringkasan.
- [ ] Pemeriksaan manual pembaca layar, kontras, dan UAT manusia tetap diperlukan sebelum rilis.

## Validasi produksi sesi sebelumnya

- [x] `pnpm typecheck` dan `pnpm lint` lulus.
- [x] `pnpm test`: 2 file, 9 test lulus.
- [x] `pnpm build` lulus; First Load JS `/gov/analytics` turun dari 610 kB ke 108 kB setelah chart ECharts ditree-shake dan bagian analitik dimuat dinamis.
- [x] Server `pnpm start` dihentikan setelah seluruh route selesai diperiksa.
- [x] Build ulang setelah optimasi: `/gov/analytics` route chunk 6.04 kB; First Load JS 108 kB.

## Batas implementasi saat ini

- Sumber berkas hanya berisi 90 kabupaten/kota; seluruh 514 wilayah belum dapat diprerender.
- Batas provinsi berisi 34 feature; enam kode kabupaten/kota CSV tidak memiliki feature sumber. Batas tidak diklaim sebagai administratif terbaru.
- Scene memakai 34 geometri sumber yang tersedia; awan visual berisi sampel interpolasi batas, bukan titik kejadian/data penduduk.
- Sankey menunjukkan jumlah paket berdata pada tahap pagu → HPS → kontrak. HPS menjadi penanda tahap tender karena sumber tidak menyediakan nilai tender terpisah; tabel menyajikan nominal untuk paket yang memiliki ketiga nilai.
- Dataset PBJ hanya mencakup sebagian wilayah; ketiadaan paket bukan bukti ketiadaan pengadaan.

## Final gate Polish IRN + IGS

- [x] `pnpm test`: 8 file, 29 test lulus.
- [x] `pnpm typecheck` dan `pnpm lint` lulus.
- [x] `pnpm build` lulus; pipeline memvalidasi 6/6 sumber inti dan 8/8 sumber Phase B, lalu Next.js menghasilkan 174 halaman.
- [x] Enam route produksi IGS merespons HTTP 200; server QA dihentikan setelah pemeriksaan.
- [x] Mobile 375 px diuji pada Pendidikan dan Infrastruktur; keduanya tidak overflow horizontal. Radar Infrastruktur default Agregat Nasional dan pilihan Jawa menampilkan enam provinsi.
- [x] Scan key pada 5.087 grup tambahan menemukan nol identifier terlarang; 10 spot-check agregat sumber lulus.
- [ ] UAT manusia, pemeriksaan pembaca layar/kontras, dan Lighthouse tetap menjadi tindak lanjut sebelum rilis.
