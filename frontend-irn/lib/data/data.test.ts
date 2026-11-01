import { describe, expect, it } from 'vitest';
import { datasetRows, derivedRows, provinces, kabkota, crossDatasetViews } from './index';
import { formatValue, getMetricValue } from './format';

describe('IGS static data', () => {
  it('reflects only regions present in the supplied datasets', () => {
    expect(provinces).toHaveLength(38);
    expect(kabkota).toHaveLength(90);
    expect(derivedRows).toHaveLength(756);
  });

  it('computes fiscal autonomy from APBD source fields', () => {
    const source = datasetRows.apbd.find((row) => row.kode_wilayah === '11' && row.tahun_anggaran === 2025);
    const result = derivedRows.find((row) => row.kode_wilayah === '11' && row.tahun_anggaran === 2025);
    expect(source).toBeDefined();
    expect(result).toBeDefined();
    const expected = (Number(source?.realisasi_pad) / Number(source?.realisasi_pendapatan_total)) * 100;
    expect(getMetricValue(result ?? {}, 'fiscal_autonomy')).toBeCloseTo(expected, 8);
  });

  it('keeps unavailable metrics explicit and exposes cross-dataset views', () => {
    expect(getMetricValue({}, 'procurement_efficiency')).toBeNull();
    expect(formatValue(null)).toBe('Data tidak tersedia');
    expect(crossDatasetViews).toHaveLength(8);
  });
});
