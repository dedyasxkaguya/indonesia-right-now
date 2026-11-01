# Kamus data Gov Stats

Pipeline memakai 39 CSV lokal pada `datasets/`: enam sumber inti, delapan sumber Phase B, dan 25 sumber tambahan. Enam sumber inti mempertahankan kolom sumbernya; sumber Phase B menormalisasi wilayah/tahun; 25 sumber tambahan hanya menghasilkan agregat yang dicantumkan di bawah. Nilai numerik desimal diubah ke `number`, sel kosong menjadi `null`, dan kode wilayah dinormalisasi sebagai teks. Unit mengikuti kolom `satuan_nilai`, nama kolom, atau definisi indikator yang tercantum di pipeline. Nama dimensi kategori adalah nilai sumber, bukan kategori yang disimpulkan aplikasi.

## APBD — `dataset_apbd_provinsi_kabkota_2020_2025.csv`

- Identitas: `kode_wilayah`, `nama_daerah`, `provinsi`, `pulau_kawasan`, `tingkat_pemerintahan`, `tahun_anggaran`.
- Unit: `satuan_nilai`; komponen nominal `alokasi_*` dan `realisasi_*` mengikuti satuan tersebut. Kolom `*_persen` adalah persentase; `rasio_belanja_modal_vs_pegawai` adalah rasio.
- Keuangan: alokasi dan realisasi pendapatan total, PAD, transfer TKDD, total belanja, belanja pegawai, modal, bansos sosial, serta barang/jasa/lainnya.
- Capaian/klasifikasi: serapan triwulanan dan tahunan, rasio kemandirian, komposisi belanja, `kategori_kapasitas_fiskal`, `sumber_referensi`.
- Keputusan semantik: derivasi memakai nilai terealisasi bila nama kolom secara eksplisit menyebut `realisasi`; tidak menyamakan alokasi dengan realisasi. Nilai yang kosong tidak menjadi nol.

## Indikator makro — `dataset_indikator_makro_kesejahteraan_ipm_kemiskinan_2020_2025.csv`

- Identitas wilayah/tahun sama seperti APBD.
- Pendidikan/kesehatan: IPM, kategori IPM BPS, angka harapan hidup, rata-rata lama sekolah, harapan lama sekolah, dan pengeluaran per kapita disesuaikan.
- Kemiskinan/ketimpangan: persentase dan jumlah penduduk miskin, garis kemiskinan, indeks kedalaman P1, keparahan P2, dan rasio Gini.
- Pasar kerja/fiskal: TPT, referensi rasio belanja bansos/modal APBD, kuadran decision support, dan sumber referensi.
- Unit mengikuti akhiran kolom (`_persen`, `_tahun`, `_ribu_jiwa`, `_ribu_rp`) atau nama kolom; garis kemiskinan memakai Rupiah per kapita per bulan.
- Keputusan semantik: P1/P2 dipertahankan sebagai indeks sumber; label kategori dan kuadran tidak diubah menjadi skor numerik.

## Ekonomi — `dataset_ketenagakerjaan_pdrb_ekonomi_regional_2020_2025.csv`

- Identitas wilayah/tahun sama seperti APBD.
- PDRB: ADHB dan ADHK total serta per kapita, dengan skala unit pada nama kolom.
- Pasar kerja: TPAK, TPT, jumlah penduduk, angkatan kerja, bekerja, dan pengangguran.
- Struktur/ketahanan: sektor dominan, skor ketahanan ekonomi dan investasi, klasifikasi ketahanan, dan sumber referensi.
- Keputusan semantik: nilai per kapita pada berkas mengikuti satuan yang tertulis di nama kolom (`ribu_rp`); tidak dikonversi atau dipakai sebagai nominal tanpa label unit.

## Pengadaan — `dataset_pbj_proyek_strategis_daerah_2020_2025.csv`

- Identitas paket: `kode_rup`, `kode_tender_lpse`, `kode_wilayah`, nama wilayah/provinsi, kawasan, level pemerintahan, tahun.
- Deskripsi: instansi pelaksana, nama paket, kategori pengadaan, sektor infrastruktur, status proyek strategis, metode pengadaan, sumber dana, status tender, pemenang.
- Nilai dan proses: pagu, HPS, kontrak, pembayaran (juta Rupiah), rasio kontrak/pagu dan kontrak/HPS, efisiensi, jumlah peserta, durasi, progres fisik, skor transparansi, indikasi audit.
- Keputusan semantik: berkas berisi **paket**, bukan satu baris agregat per wilayah-tahun. Efisiensi turunan menghitung rerata `(1 − kontrak/HPS) × 100` hanya saat HPS dan kontrak numerik serta HPS bukan nol. Angka ini bukan ukuran mutu pekerjaan.
- Cakupan wilayah lebih kecil daripada dataset lainnya; ketiadaan paket tidak membuktikan tidak adanya pengadaan.

## Layanan — `dataset_rasio_fasilitas_publik_kesehatan_pendidikan_2020_2025.csv`

- Identitas wilayah/tahun sama seperti APBD.
- Kesehatan: fasilitas per 10.000 penduduk dan dokter per 10.000 penduduk.
- Pendidikan: rasio sekolah per 1.000 penduduk usia sekolah, rasio guru terhadap murid, dan persentase kondisi gedung sekolah layak.
- Akses/klasifikasi: indeks aksesibilitas layanan publik, status layanan, dan sumber.
- Keputusan semantik: rasio guru-murid yang lebih kecil dibalik tandanya hanya untuk z-score komposit pendidikan; nilai asli tetap disimpan. Indeks pendidikan menjumlahkan z-score indikator yang tersedia.

## Tata kelola — `dataset_tata_kelola_spbe_spm_pelayanan_publik_2020_2025.csv`

- Identitas wilayah/tahun sama seperti APBD.
- Skor: indeks SPBE skala 1–5, indeks pelayanan publik skala 1–5, penerapan e-budgeting/transparansi, capaian SPM, serta indeks tata kelola/efisiensi birokrasi.
- Kategori dan sumber: predikat SPBE, kategori mutu pelayanan, klasifikasi kualitas tata kelola, sumber referensi.
- Keputusan semantik: skor sumber berada pada skala berbeda. Komposit tata kelola mengikuti rumus yang diminta (rerata tiga kolom) dan **tidak dinormalisasi lintas skala**; interpretasi harus mempertimbangkan hal tersebut.

## 25 sumber tambahan — keluaran agregat provinsi

Setiap berkas berikut dibaca saat `prebuild`; hanya baris agregat provinsi yang masuk `lib/data/additional.json`. `Tahun` menunjukkan tahun yang ditemukan setelah normalisasi; rentang parsial tidak diisi. `Baris keluaran` menghitung grup provinsi/tahun/dimensi yang lolos aturan minimisasi, bukan jumlah baris CSV sumber. Nilai uang disimpan dalam Rupiah penuh dan hanya dipadatkan saat ditampilkan.

| Sumber CSV | Bidang | Tahun | Cakupan | Baris keluaran | Ringkasan dan unit utama |
|---|---|---:|---:|---:|---|
| `data_guru_dan_tenaga_kependidikan_indonesia.csv` | Pendidikan | 2024–2026 | 38 provinsi | 114 | Jumlah catatan; rerata usia (tahun) dan jam mengajar (jam/minggu). |
| `data_indikator_kinerja_pendidikan_daerah_indonesia.csv` | Pendidikan | 2023–2025 | 38 provinsi | 456 | Per jenjang sekolah: rerata APM/APK/putus sekolah (%), literasi/numerasi (skor), dan indeks SPM. |
| `data_partisipasi_pemilih_dan_tps_pemilu_indonesia.csv` | Pemerintahan | 2024–2025 | 38 provinsi | 228 | Per jenis pemilihan: jumlah TPS/catatan, total DPT dan pengguna hak pilih (orang), partisipasi rata-rata (%). |
| `data_penyaluran_bantuan_operasional_sekolah_bos_indonesia.csv` | Pendidikan | 2023–2025 | 38 provinsi | 114 | Jumlah penyaluran, total dana BOS (Rupiah), realisasi rata-rata (%). |
| `data_peserta_didik_dan_penerima_pip_indonesia.csv` | Pendidikan | 2024–2026 | 38 provinsi | 114 | Jumlah penyaluran PIP dan nominal bantuan (Rupiah). |
| `data_sekolah_dan_sarana_prasarana_indonesia.csv` | Pendidikan | 2023–2025 | 38 provinsi | 114 | Jumlah sekolah, peserta didik/guru/ruang kelas, rasio siswa-guru. |
| `dataset_pemantauan_pangan_indonesia_25k.csv` | Pangan | 2026 | 12 provinsi | 180 | Per komoditas/satuan sumber: rerata harga produsen/konsumen (Rupiah) dan pasokan (ton/hari). |
| `dataset_satuan_pendidikan_indonesia_25k.csv` | Pendidikan | Snapshot tanpa tahun | 12 provinsi | 12 | Jumlah satuan pendidikan, peserta didik, guru, dan ruang kelas. |
| `evaluasi_kinerja_pelayanan_publik_mpp_indonesia.csv` | Pemerintahan | 2024–2026 | 38 provinsi | 114 | Catatan, antrean/layanan selesai/tertunda, penyelesaian (%), waktu tunggu (menit), indeks. |
| `indeks_desa_membangun_dan_status_perkembangan_desa_indonesia.csv` | Daerah | 2022–2024 | 24 provinsi | 72 | Catatan desa, rerata ketahanan/IDM (indeks), alokasi dana desa (Rupiah). |
| `infrastruktur_irigasi_dan_sumber_daya_air_indonesia.csv` | Infrastruktur | 2024–2026 | 38 provinsi | 114 | Catatan, luas layanan (hektare), debit (liter/detik), panjang (meter), biaya pemeliharaan (Rupiah). |
| `infrastruktur_telekomunikasi_dan_konektivitas_digital_indonesia.csv` | Infrastruktur | 2024–2026 | 38 provinsi | 114 | Catatan site, kecepatan (Mbps), bandwidth (Gbps), uptime (%), populasi terlayani (jiwa). |
| `neraca_ketersediaan_dan_cadangan_pangan_daerah_indonesia.csv` | Pangan | 2024–2026 | 38 provinsi | 1.205 | Per komoditas: rerata kebutuhan/produksi/ketersediaan/surplus (ton/bulan), cadangan (ton), ketahanan pasokan (hari). |
| `paket_pengadaan_barang_jasa_pemerintah_indonesia.csv` | Pemerintahan | 2022–2024 | 24 provinsi | 72 | Jumlah paket dan total pagu, HPS, kontrak, efisiensi (Rupiah). |
| `pelayanan_administrasi_kependudukan_daerah_indonesia.csv` | Pemerintahan | 2024–2026 | 38 provinsi | 114 | Catatan, permohonan/dokumen/layanan, penyelesaian (%), waktu (menit), kepuasan (indeks). |
| `pemantauan_harga_pangan_pokok_dan_strategis_indonesia.csv` | Pangan | 2025–2026 | 38 provinsi | 1.054 | Per komoditas/satuan sumber: rerata harga produsen/eceran/HET (Rupiah) dan deviasi (%). |
| `pemantauan_kualitas_udara_dan_ispu_indonesia.csv` | Lingkungan | 2025–2026 | 38 provinsi | 76 | Catatan, PM2.5/PM10 (µg/m³), ISPU, kelembapan (%). |
| `pemantauan_program_strategis_nasional_psn_indonesia.csv` | Infrastruktur | 2024–2026 | 38 provinsi | 114 | Jumlah proyek, investasi (Rupiah), progres fisik/keuangan (%), tenaga kerja (orang). |
| `pengaduan_pelayanan_publik_sp4n_lapor_indonesia.csv` | Pemerintahan | 2025–2026 | 38 provinsi | 76 | Jumlah aduan, durasi tindak lanjut (hari), kepuasan pelapor (bintang). |
| `penyaluran_bantuan_sosial_pkh_bpnt_indonesia.csv` | Sosial & Publik | 2024–2026 | 38 provinsi | 114 | Jumlah catatan penyaluran dan nominal bantuan sosial (Rupiah). |
| `penyaluran_kredit_usaha_rakyat_umkm_indonesia.csv` | Ekonomi | 2022–2024 | 29 provinsi | 87 | Catatan, plafon pinjaman (Rupiah), bunga (%), tenor (bulan), indikator NPL. |
| `realisasi_anggaran_pendapatan_dan_belanja_daerah_indonesia.csv` | Pemerintahan | 2024–2026 | 38 provinsi | 114 | Catatan rekening, total DPA/realisasi/varians (Rupiah), realisasi rata-rata (%). |
| `realisasi_investasi_penanaman_modal_indonesia.csv` | Ekonomi | 2022–2024 | 29 provinsi | 87 | Catatan proyek, investasi (Rupiah/USD), tenaga kerja Indonesia/asing (orang). |
| `realisasi_program_penghapusan_kemiskinan_ekstrem_p3ke_indonesia.csv` | Sosial & Publik | 2024–2026 | 38 provinsi | 114 | Catatan keluarga sasaran, stimulan (Rupiah), kemandirian (skor), kenaikan pendapatan (%). |
| `timbulan_dan_pengelolaan_sampah_daerah_indonesia.csv` | Lingkungan | 2024–2026 | 38 provinsi | 114 | Catatan, timbulan/pengurangan/penanganan (ton), komposisi (%). |

### Aturan agregasi dan privasi sumber tambahan

- `scripts/additional-datasets.mjs` menjadi registry eksplisit untuk nama sumber, bidang, tahun, dimensi aman, metrik, deskripsi, dan unit. Kolom wajib yang hilang atau tahun/provinsi yang tidak dapat dipetakan menghentikan build.
- Besaran aditif dijumlahkan; metrik rerata dihitung dari nilai numerik yang tersedia per provinsi. Ringkasan nasional/pulau untuk rerata dibobot populasi memakai data tahun yang dipilih atau populasi terbaru yang tersedia sebelumnya. Sel kosong dilewati, tidak diubah menjadi nol.
- Grup berisi kurang dari lima catatan tidak diterbitkan. JSON hanya memuat kode/nama provinsi, pulau, tahun, kategori yang diizinkan, dan metrik agregat; NUPTK, NISN, NPSN, ID/tiket, nama/alamat fasilitas, koordinat, serta kolom identifier lain tidak diteruskan.
- Sumber tanpa tahun tetap menjadi snapshot terpisah. Sumber 2026 tersedia untuk beberapa bidang, tetapi data inti/visualisasi historis berhenti pada 2025; data kosong pada tahun terpilih bukan bukti nilai nol.
- Cakupan sumber tambahan tidak seragam (12/24/29/38 provinsi). Wilayah dan tahun yang tidak ada tetap tidak ada; tidak ada imputasi.

## Cakupan dan anomali yang dicatat

- Enam dataset inti wilayah umum masing-masing memiliki 756 baris untuk enam tahun dan 128 kode wilayah; 38 di antaranya provinsi dan 90 kabupaten/kota. Berkas tidak meliputi seluruh 514 kabupaten/kota.
- Dataset PBJ memiliki 1.155 baris paket dan 76 kode wilayah; jumlah barisnya tidak dapat dibandingkan langsung dengan dataset tahunan.
- Referensi sumber adalah teks yang disediakan di CSV, bukan verifikasi independen atas setiap angka.
- Z-score dihitung per tahun dan terpisah antara provinsi dan kabupaten/kota. Nilai null dilewati saat agregasi dan tetap null jika tidak ada nilai yang dapat dihitung.
