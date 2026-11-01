import { describe, expect, it } from 'vitest';
import { populationWeightedMean } from './aggregation';

describe('populationWeightedMean', () => {
  it('weights valid observations by population', () => {
    expect(populationWeightedMean([
      { indikator: 10, jumlah_penduduk_total_ribu_jiwa: 100 },
      { indikator: 20, jumlah_penduduk_total_ribu_jiwa: 300 },
    ], 'indikator')).toBe(17.5);
  });

  it('excludes missing values and invalid population weights', () => {
    expect(populationWeightedMean([
      { indikator: 10, jumlah_penduduk_total_ribu_jiwa: 100 },
      { indikator: null, jumlah_penduduk_total_ribu_jiwa: 300 },
      { indikator: 50, jumlah_penduduk_total_ribu_jiwa: 0 },
      { indikator: 90, jumlah_penduduk_total_ribu_jiwa: null },
    ], 'indikator')).toBe(10);
    expect(populationWeightedMean([
      { indikator: 10, jumlah_penduduk_total_ribu_jiwa: null },
    ], 'indikator')).toBeNull();
  });
});
