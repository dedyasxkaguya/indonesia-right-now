const labels: Record<string, string> = {
  apbd: 'Anggaran pendapatan dan belanja daerah',
  ekonomi: 'Ekonomi daerah',
  fiscal_autonomy: 'Kemandirian fiskal',
  fiscal_absorption: 'Penyerapan anggaran',
  fiscal_autonomy_score: 'Indeks kemandirian fiskal',
  indeks_kemandirian_fiskal: 'Indeks kemandirian fiskal',
  skor_pembangunan: 'Skor pembangunan',
  fiscal_welfare_quadrant: 'Kuadran fiskal dan kesejahteraan',
  budget_stress: 'Tekanan anggaran',
  welfare_composite: 'Indeks kesejahteraan',
  regional_development_index: 'Indeks pembangunan daerah',
  nilai: 'Nilai',
  wilayah: 'Wilayah',
  provinsi: 'Provinsi',
  kabupaten_kota: 'Kabupaten/kota',
  kode: 'Kode wilayah',
  nama_daerah: 'Nama wilayah',
  metrik: 'Indikator',
  metrik_baris: 'Indikator baris',
  metrik_kolom: 'Indikator kolom',
  pearson_r: 'Korelasi Pearson',
  jumlah_provinsi: 'Jumlah provinsi',
  tahun: 'Tahun',
  kemiskinan_persen: 'Penduduk miskin (%)',
  ipm: 'Indeks pembangunan manusia',
  satuan: 'Satuan',
  terpilih: 'Wilayah aktif',
  geometri: 'Geometri',
  spbe_sumber_skala_1_sampai_5: 'Indeks SPBE (skala 1–5)',
  ebudgeting_skor_sumber: 'E-budgeting (skor sumber)',
  capaian_spm_persen: 'Capaian SPM (%)',
  e_budgeting: 'E-budgeting',
  capaian_SPM: 'Capaian SPM',
  perubahan_vs_tahun_sebelumnya: 'Perubahan dari tahun sebelumnya',
  jumlah_wilayah_berdata: 'Jumlah wilayah dengan data',
  realisasi_belanja_modal: 'Realisasi belanja modal',
  sektor_dominan: 'Sektor ekonomi dominan',
  governance: 'Tata kelola pemerintahan',
  governance_digital: 'Tata kelola digital',
  education_quality: 'Mutu pendidikan',
  economic_resilience: 'Ketahanan ekonomi',
  productivity_per_capita: 'Produktivitas per kapita',
  pbj: 'Pengadaan barang dan jasa',
  layanan: 'Layanan publik',
  makro: 'Indikator sosial dan ekonomi',
  procurement_efficiency: 'Efisiensi pengadaan',
  service_access_index: 'Akses layanan dasar',
  social_share: 'Porsi belanja sosial',
  capital_share: 'Porsi belanja modal',
  persentase_penduduk_miskin_persen: 'Penduduk miskin',
  tingkat_pengangguran_terbuka_tpt_persen: 'Tingkat pengangguran terbuka',
  indeks_pembangunan_manusia_ipm: 'Indeks pembangunan manusia',
  pdrb_per_kapita_adhk_ribu_rp: 'PDRB per kapita',
  tahun_anggaran: 'Tahun anggaran',
  kode_wilayah: 'Kode wilayah',
  x_metric: 'Metrik sumbu horizontal',
  y_metric: 'Metrik sumbu vertikal',
};

export function getIgsLabel(key: string) {
  const normalized = key.replace(/^_derived_/, '');
  if (labels[normalized]) return labels[normalized];
  return normalized.replaceAll('_', ' ').replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('id-ID'));
}

export function getIgsUnit(unit: string) {
  return unit.replace(/skor-z/gi, 'indeks relatif').replace(/z-score/gi, 'nilai relatif');
}

export function getIgsFormula(formula: string) {
  return formula
    .replace(/z-score/gi, 'nilai relatif')
    .replace(/\bz\(([^)]+)\)/gi, 'nilai relatif dari $1')
    .replace(/\bnull\b/gi, 'data kosong');
}
