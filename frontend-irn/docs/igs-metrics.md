# Definisi metrik IGS

Semua perhitungan deterministik diimplementasikan pada `scripts/build-data.mjs` dan dikeluarkan di `lib/data/derived/`. Z-score dihitung per tahun, terpisah untuk tingkat provinsi dan kabupaten/kota, menggunakan simpangan baku populasi dari wilayah yang memiliki nilai. Null dilewati; bila tidak ada variasi nilai numerik, z-score numerik menjadi 0. Nilai hilang tidak diimputasi.

| ID | Rumus | Unit | Arah | Catatan interpretasi |
|---|---|---|---|---|
| `fiscal_autonomy` | realisasi PAD / realisasi pendapatan total × 100 | % | Lebih tinggi | Rasio pendapatan, bukan ukuran kebutuhan fiskal. |
| `fiscal_absorption` | realisasi belanja total / alokasi belanja total × 100 | % | Lebih tinggi | Serapan aritmetis; nilai dapat melampaui 100% jika sumber demikian. |
| `capital_share` | realisasi belanja modal / realisasi belanja total × 100 | % | Tidak ditetapkan | Porsi komposisi belanja, bukan kualitas investasi. |
| `social_share` | realisasi belanja bansos sosial / realisasi belanja total × 100 | % | Tidak ditetapkan | Mengikuti kolom APBD bernama bansos sosial. |
| `service_access_index` | rerata z-score fasilitas kesehatan/10.000, dokter/10.000, sekolah/1.000 | skor-z | Lebih tinggi | Ketersediaan relatif; bukan mutu layanan. |
| `education_quality` | z(kebalikan rasio guru-murid) + z(gedung layak) + z(HLS) | skor-z | Lebih tinggi | HLS berasal dari dataset makro; komposit keluaran/proksi. Nilai null dilewati. |
| `welfare_composite` | z(IPM) − z(kemiskinan) − z(Gini) − z(TPT) | skor-z | Lebih tinggi | Empat indikator distandardisasi per tahun dan level wilayah; null dilewati. |
| `economic_resilience` | z(pertumbuhan) + z(skor ketahanan) − z(TPT) | skor-z | Lebih tinggi | Nilai null dilewati; jumlah indikator yang tersedia dapat berbeda antarwilayah. |
| `governance_digital` | rerata SPBE, e-budgeting, dan capaian SPM | skor gabungan | Lebih tinggi | Skala input berbeda dan dipertahankan; jangan membandingkan sebagai skala baku. |
| `procurement_efficiency` | rerata `(1 − nilai kontrak / HPS) × 100` per wilayah-tahun | % | Lebih tinggi | Hanya paket dengan kontrak/HPS numerik dan HPS bukan nol. Bukan indikator mutu/kompetisi. |
| `fiscal_welfare_quadrant` | kemandirian fiskal dan komposit kesejahteraan di atas/bawah median tahun dan level yang sama | kategori | — | Membentuk empat kuadran; pembagian bukan ambang kebijakan. |
| `budget_stress` | porsi belanja modal / porsi belanja bansos sosial | rasio | Tidak ditetapkan | Tidak terdefinisi bila penyebut nol/hilang. |
| `productivity_per_capita` | PDRB ADHK (miliar Rp) / penduduk bekerja (ribu jiwa) | juta Rp/orang | Lebih tinggi | Hasil rasio mengikuti konversi satuan miliar/ribu. |
| `dependency_ratio` | (penduduk total − angkatan kerja) / angkatan kerja | rasio | Lebih rendah | Proksi berbasis definisi kolom sumber, bukan rasio demografi BPS baku. |
| `composite_development_score` | rerata z-score dari empat komposit: fiskal, akses layanan, kesejahteraan, dan ketahanan ekonomi | skor-z | Lebih tinggi | Skor relatif; bukan peringkat mutu absolut atau sebab-akibat. |

Setiap JSON metrik menyertakan `formula_doc`, `higher_is_better`, `unit`, dan `decimals`. Angka mentah untuk z-score tetap tersedia pada dataset sumber/hasil gabungan.
