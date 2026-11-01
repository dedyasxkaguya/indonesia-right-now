import { describe, expect, it } from 'vitest';
import type {
  AgricultureRow,
  DisasterRow,
  ElectrificationRow,
  PopulationRow,
  RoadConditionRow,
  SlumAreaRow,
  WasteFacilityRow,
  WaterSanitationRow,
} from '../../types/datasets';
import agriculture from '../../data/pertanian.json';
import disasters from '../../data/bencana.json';
import economy from '../../data/ekonomi.json';
import electricity from '../../data/elektrifikasi.json';
import roads from '../../data/jalan.json';
import slums from '../../data/kumuh.json';
import wasteFacilities from '../../data/tpa.json';
import water from '../../data/air_sanitasi.json';
import {
  computeBasicServiceDeficit,
  computeDisasterExposure,
  computeFoodProductionPerCapita,
  computeFoodProductivity,
  computeInfrastructureAccess,
  computeRoadAuthorityGap,
  computeSlumReduction,
  computeWasteOvercapacity,
} from './index';

const electricityRows = electricity.rows as ElectrificationRow[];
const agricultureRows = agriculture.rows as AgricultureRow[];
const disasterRows = disasters.rows as DisasterRow[];
const populationRows = economy.rows
  .filter((row) => row.tingkat_pemerintahan === 'Provinsi')
  .map((row) => ({
    kode_wilayah: row.kode_wilayah,
    nama_daerah: row.nama_daerah,
    tahun_anggaran: row.tahun_anggaran,
    jumlah_penduduk_total_ribu_jiwa: row.jumlah_penduduk_total_ribu_jiwa,
  })) as PopulationRow[];
const roadRows = roads.rows as RoadConditionRow[];
const slumRows = slums.rows as SlumAreaRow[];
const wasteRows = wasteFacilities.rows as WasteFacilityRow[];
const waterRows = water.rows as WaterSanitationRow[];

describe('Phase B derived metrics', () => {
  it('computes the weighted infrastructure index and returns honest empty state on null input', () => {
    const result = computeInfrastructureAccess(electricityRows, waterRows, roadRows);
    const aceh = result.byProvince['11']?.find((row) => row.tahun === 2023);
    const electricityValue = electricityRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023)?.rasio_elektrifikasi_total_persen;
    const waterValue = waterRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023)?.persen_air_minum_layak;
    const sanitationValue = waterRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023)?.persen_sanitasi_layak;
    const roadValue = roadRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023 && row.tingkat_kewenangan === 'Kabupaten/Kota')?.persen_mantap;
    expect(aceh?.akses_layanan_dasar).toBeCloseTo(
      0.3 * Number(electricityValue) + 0.3 * Number(waterValue) + 0.2 * Number(sanitationValue) + 0.2 * Number(roadValue),
    );
    expect(result.insufficient).toBe(false);

    const brokenWater = waterRows.map((row) => (
      row.kode_wilayah === '11' && row.tahun === 2023
        ? { ...row, persen_air_minum_layak: null }
        : row
    ));
    expect(computeInfrastructureAccess(electricityRows, brokenWater, roadRows)).toEqual({
      byProvince: {},
      insufficient: true,
    });
  });

  it('computes road-authority gaps and preserves null slum observations', () => {
    const road = computeRoadAuthorityGap(roadRows).byProvince['11']?.find((row) => row.tahun === 2023);
    const national = roadRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023 && row.tingkat_kewenangan === 'Nasional')?.persen_mantap;
    const local = roadRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023 && row.tingkat_kewenangan === 'Kabupaten/Kota')?.persen_mantap;
    expect(road?.kesenjangan_jalan_persen_poin).toBeCloseTo(Number(national) - Number(local));

    const allSlums = computeSlumReduction(slumRows);
    expect(allSlums.insufficient).toBe(true);
    expect(allSlums.byProvince).toEqual({});

    const validSlumRows = slumRows.filter((row) => row.tahun === 2023);
    const slum = computeSlumReduction(validSlumRows).byProvince['11']?.find((row) => row.tahun === 2023);
    const source = slumRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023);
    expect(slum?.pengurangan_kumuh_persen).toBeCloseTo(
      (Number(source?.pengurangan_kumuh_kumulatif_ha) / Number(source?.luas_sk_kumuh_awal_ha)) * 100,
    );
  });

  it('computes disaster exposure using population in people, not thousands', () => {
    const result = computeDisasterExposure(disasterRows, populationRows);
    const aceh = result.byProvince['11']?.find((row) => row.tahun === 2023);
    const acehDisasters = disasterRows.filter((row) => row.kode_wilayah === '11' && row.tahun === 2023);
    const population = populationRows.find((row) => row.kode_wilayah === '11' && row.tahun_anggaran === 2023)?.jumlah_penduduk_total_ribu_jiwa;
    const displaced = acehDisasters.reduce((sum, row) => sum + Number(row.korban_menderita_mengungsi), 0);
    const severeDamage = acehDisasters.reduce((sum, row) => sum + Number(row.rumah_rusak_berat), 0);
    expect(aceh?.indeks_paparan_bencana).toBeCloseTo(((displaced + 5 * severeDamage) / (Number(population) * 1000)) * 1000);
    expect(result.insufficient).toBe(false);
  });

  it('computes facility capacity and both crop production-per-capita measures', () => {
    const waste = computeWasteOvercapacity(wasteRows);
    expect(waste.insufficient).toBe(false);
    expect(waste.facilities).toHaveLength(wasteRows.length);
    const facility = waste.facilities.find((row) => row.kode_wilayah === '3175' && row.tahun === 2023);
    expect(facility?.rasio_kapasitas).toBeCloseTo(7500 / 8000);

    const allFood = computeFoodProductionPerCapita(agricultureRows, populationRows);
    expect(allFood.insufficient).toBe(true);
    expect(allFood.byProvince).toEqual({});

    const acehFoodRows = agricultureRows.filter((row) => (
      row.kode_wilayah === '11'
      && row.tahun === 2023
      && (row.komoditas === 'Padi' || row.komoditas === 'Beras')
    ));
    const acehPopulationRows = populationRows.filter((row) => row.kode_wilayah === '11' && row.tahun_anggaran === 2023);
    const food = computeFoodProductionPerCapita(acehFoodRows, acehPopulationRows);
    const acehFood = food.byProvince['11']?.find((row) => row.tahun === 2023);
    const acehPadi = agricultureRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023 && row.komoditas === 'Padi')?.produksi_ton;
    const acehBeras = agricultureRows.find((row) => row.kode_wilayah === '11' && row.tahun === 2023 && row.komoditas === 'Beras')?.produksi_ton;
    const acehPopulation = populationRows.find((row) => row.kode_wilayah === '11' && row.tahun_anggaran === 2023)?.jumlah_penduduk_total_ribu_jiwa;
    expect(acehFood?.produksi_padi_per_kapita).toBeCloseTo(Number(acehPadi) / (Number(acehPopulation) * 1000));
    expect(acehFood?.produksi_beras_per_kapita).toBeCloseTo(Number(acehBeras) / (Number(acehPopulation) * 1000));
  });

  it('computes population-weighted productivity and basic-service deficit', () => {
    const productivity = computeFoodProductivity(agricultureRows, populationRows);
    const acehProductivity = productivity.byProvince['11']?.find((row) => row.tahun === 2023);
    const acehValues = agricultureRows.filter((row) => (
      row.kode_wilayah === '11'
      && row.tahun === 2023
      && typeof row.produktivitas_ton_per_ha === 'number'
    ));
    const expectedProductivity = acehValues.reduce((sum, row) => sum + Number(row.produktivitas_ton_per_ha), 0) / acehValues.length;
    expect(acehProductivity?.produktivitas_rata_rata_ton_per_ha).toBeCloseTo(expectedProductivity);

    const access = computeInfrastructureAccess(electricityRows, waterRows, roadRows);
    const deficit = computeBasicServiceDeficit(access).byProvince['11']?.find((row) => row.tahun === 2023);
    expect(deficit?.defisit_layanan_dasar).toBeCloseTo(100 - Number(deficit?.akses_layanan_dasar));
  });
});
