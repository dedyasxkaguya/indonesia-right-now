export interface DatasetMetadata {
  fields: string[];
  units: Record<string, string>;
  source: string;
}

export interface ElectrificationRow {
  tahun: number;
  kode_wilayah: string;
  kode_provinsi: string;
  nama_provinsi: string;
  level: 'provinsi';
  rasio_elektrifikasi_total_persen: number | null;
  rasio_elektrifikasi_pln_persen: number | null;
  persen_rumah_tangga_listrik_bps: number | null;
  total_desa: number | null;
  desa_berlistrik_pln: number | null;
  desa_berlistrik_non_pln: number | null;
  desa_berlistrik_ltshe: number | null;
  desa_belum_berlistrik: number | null;
  rasio_desa_berlistrik_persen: number | null;
  sumber_data: string | null;
}

export interface ElectrificationDataset {
  rows: ElectrificationRow[];
  meta: DatasetMetadata;
}

export interface AgricultureRow {
  tahun: number;
  kode_wilayah: string;
  kode_provinsi: string;
  nama_provinsi: string;
  level: 'provinsi';
  komoditas: string | null;
  subsektor: string | null;
  satuan: string | null;
  luas_panen_ha: number | null;
  produksi_ton: number | null;
  produktivitas_ton_per_ha: number | null;
  sumber_data: string | null;
}

export interface AgricultureDataset {
  rows: AgricultureRow[];
  meta: DatasetMetadata;
}

export interface DisasterRow {
  tahun: number;
  kode_wilayah: string;
  kode_provinsi: string;
  nama_provinsi: string;
  level: 'provinsi';
  jenis_bencana: string | null;
  jumlah_kejadian: number | null;
  korban_meninggal: number | null;
  korban_hilang: number | null;
  korban_luka_luka: number | null;
  korban_menderita_mengungsi: number | null;
  rumah_rusak_berat: number | null;
  rumah_rusak_sedang: number | null;
  rumah_rusak_ringan: number | null;
  rumah_terendam: number | null;
  fasilitas_pendidikan_rusak: number | null;
  fasilitas_peribadatan_rusak: number | null;
  fasilitas_kesehatan_rusak: number | null;
  sumber_data: string | null;
}

export interface DisasterDataset {
  rows: DisasterRow[];
  meta: DatasetMetadata;
}

export interface WaterSanitationRow {
  tahun: number;
  kode_wilayah: string;
  kode_provinsi: string;
  nama_provinsi: string;
  level: 'provinsi';
  persen_air_minum_layak: number | null;
  persen_air_minum_aman: number | null;
  persen_sanitasi_layak: number | null;
  persen_sanitasi_aman: number | null;
  sumber_data: string | null;
}

export interface WaterSanitationDataset {
  rows: WaterSanitationRow[];
  meta: DatasetMetadata;
}

export interface RoadConditionRow {
  tahun: number;
  kode_wilayah: string;
  kode_provinsi: string;
  nama_provinsi: string;
  level: 'provinsi';
  tingkat_kewenangan: string | null;
  panjang_total_km: number | null;
  kondisi_baik_km: number | null;
  kondisi_sedang_km: number | null;
  kondisi_rusak_ringan_km: number | null;
  kondisi_rusak_berat_km: number | null;
  mantap_km: number | null;
  tidak_mantap_km: number | null;
  persen_mantap: number | null;
  persen_tidak_mantap: number | null;
  sumber_data: string | null;
}

export interface RoadConditionDataset {
  rows: RoadConditionRow[];
  meta: DatasetMetadata;
}

export interface WasteFacilityRow {
  tahun: number;
  kode_wilayah: string;
  kode_provinsi: string;
  kode_kabupaten_kota: string | null;
  nama_provinsi: string;
  nama_kabupaten_kota: string | null;
  nama_tpa: string | null;
  level: 'provinsi' | 'kabkota';
  latitude: number | null;
  longitude: number | null;
  luas_total_ha: number | null;
  luas_terisi_ha: number | null;
  sampah_masuk_ton_per_hari: number | null;
  kapasitas_desain_ton_per_hari: number | null;
  sistem_operasional: string | null;
  status_operasional: string | null;
  keterangan: string | null;
  sumber_data: string | null;
}

export interface WasteFacilityDataset {
  rows: WasteFacilityRow[];
  meta: DatasetMetadata;
}

export interface SlumAreaRow {
  tahun: number;
  kode_wilayah: string;
  kode_provinsi: string;
  nama_provinsi: string;
  level: 'provinsi';
  luas_sk_kumuh_awal_ha: number | null;
  pengurangan_kumuh_kumulatif_ha: number | null;
  sisa_luas_kumuh_ha: number | null;
  jumlah_kawasan_kumuh: number | null;
  jumlah_rt_kumuh: number | null;
  luas_kumuh_ringan_ha: number | null;
  luas_kumuh_sedang_ha: number | null;
  luas_kumuh_berat_ha: number | null;
  persen_rt_kumuh_perkotaan_bps: number | null;
  sumber_data: string | null;
}

export interface SlumAreaDataset {
  rows: SlumAreaRow[];
  meta: DatasetMetadata;
}

export type SocialIndicatorSource = 'old' | 'new' | null;

export interface SocialIndicatorSources {
  tpak_total_persen: SocialIndicatorSource;
  tpt_total_persen: SocialIndicatorSource;
  persentase_penduduk_miskin: SocialIndicatorSource;
  gini_ratio: SocialIndicatorSource;
  jumlah_penduduk_total_ribu_jiwa: SocialIndicatorSource;
}

export interface SocialIndicatorRow {
  tahun: number;
  kode_wilayah: string;
  kode_provinsi: string;
  nama_provinsi: string;
  level: 'provinsi';
  tpak_total_persen: number | null;
  tpak_laki_laki_persen: number | null;
  tpak_perempuan_persen: number | null;
  tpt_total_persen: number | null;
  tpt_laki_laki_persen: number | null;
  tpt_perempuan_persen: number | null;
  tpt_pendidikan_tinggi_persen: number | null;
  tpt_pendidikan_menengah_persen: number | null;
  rata_rata_upah_sebulan_rupiah: number | null;
  persentase_penduduk_miskin: number | null;
  garis_kemiskinan_rupiah: number | null;
  pengeluaran_per_kapita_sebulan_rupiah: number | null;
  gini_ratio: number | null;
  jumlah_penduduk_total_ribu_jiwa: number | null;
  sumber_data: string | null;
  _source: SocialIndicatorSources;
}

export interface SocialIndicatorDataset {
  rows: SocialIndicatorRow[];
  meta: DatasetMetadata;
}

export interface PopulationRow {
  kode_wilayah: string;
  nama_daerah: string;
  tahun_anggaran: number;
  jumlah_penduduk_total_ribu_jiwa: number | null;
}

export interface ProvinceMetricRow {
  kode_wilayah: string;
  nama_provinsi: string;
  tahun: number;
}

export interface MetricResult<T extends ProvinceMetricRow> {
  byProvince: Record<string, T[]>;
  insufficient: boolean;
}

export interface InfrastructureAccessRow extends ProvinceMetricRow {
  akses_layanan_dasar: number;
}

export interface RoadAuthorityGapRow extends ProvinceMetricRow {
  jalan_nasional_mantap_persen: number;
  jalan_kabkota_mantap_persen: number;
  kesenjangan_jalan_persen_poin: number;
}

export interface SlumReductionRow extends ProvinceMetricRow {
  pengurangan_kumuh_persen: number;
}

export interface DisasterExposureRow extends ProvinceMetricRow {
  indeks_paparan_bencana: number;
  korban_mengungsi: number;
  rumah_rusak_berat: number;
  jumlah_penduduk_ribu_jiwa: number;
}

export interface WasteFacilityMetric {
  kode_wilayah: string;
  kode_provinsi: string;
  nama_provinsi: string;
  nama_tpa: string;
  tahun: number;
  latitude: number;
  longitude: number;
  sampah_masuk_ton_per_hari: number;
  kapasitas_desain_ton_per_hari: number;
  rasio_kapasitas: number;
  overcapacity: boolean;
}

export interface WasteOvercapacityProvinceRow extends ProvinceMetricRow {
  jumlah_tpa_overcapacity: number;
  rasio_maksimum: number;
  jumlah_tpa_terukur: number;
}

export interface WasteOvercapacityResult extends MetricResult<WasteOvercapacityProvinceRow> {
  facilities: WasteFacilityMetric[];
}

export interface FoodProductionPerCapitaRow extends ProvinceMetricRow {
  produksi_padi_per_kapita: number;
  produksi_beras_per_kapita: number;
  produksi_padi_ton: number;
  produksi_beras_ton: number;
  jumlah_penduduk_ribu_jiwa: number;
}

export interface FoodProductivityRow extends ProvinceMetricRow {
  produktivitas_rata_rata_ton_per_ha: number;
}

export interface BasicServiceDeficitRow extends ProvinceMetricRow {
  defisit_layanan_dasar: number;
  akses_layanan_dasar: number;
}
