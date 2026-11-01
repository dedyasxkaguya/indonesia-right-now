import { describe, expect, it } from 'vitest';
import type { DatasetRow, Region } from '../data/schemas';
import {
  filterRowsByRegionSelection,
  getProvinceRegions,
  NATIONAL_REGION_SELECTION,
} from './region-selection';

const regions: Region[] = [
  { kode_wilayah: '11', nama_daerah: 'Aceh', provinsi: 'Aceh', pulau_kawasan: 'Sumatera', tingkat_pemerintahan: 'Provinsi' },
  { kode_wilayah: '12', nama_daerah: 'Sumatera Utara', provinsi: 'Sumatera Utara', pulau_kawasan: 'Sumatera', tingkat_pemerintahan: 'Provinsi' },
  { kode_wilayah: '1101', nama_daerah: 'Kabupaten Simeulue', provinsi: 'Aceh', pulau_kawasan: 'Sumatera', tingkat_pemerintahan: 'Kabupaten' },
  { kode_wilayah: '31', nama_daerah: 'DKI Jakarta', provinsi: 'DKI Jakarta', pulau_kawasan: 'Jawa', tingkat_pemerintahan: 'Provinsi' },
];

describe('region hierarchy selection', () => {
  it('lists only provinces in the province selector', () => {
    expect(getProvinceRegions(regions).map((region) => region.kode_wilayah)).toEqual(['11', '31', '12']);
  });

  it('keeps national rows and scopes island selections to province rows', () => {
    const rows = [
      { kode_wilayah: '11', nilai: 10 },
      { kode_wilayah: '12', nilai: 20 },
      { kode_wilayah: '31', nilai: 30 },
    ];

    expect(filterRowsByRegionSelection(rows, NATIONAL_REGION_SELECTION, regions)).toEqual(rows);
    expect(filterRowsByRegionSelection(rows, { island: 'Sumatera', provinceCode: null }, regions)).toEqual(rows.slice(0, 2));
  });

  it('uses province data directly or falls back to its district rows', () => {
    const provinceRows: DatasetRow[] = [
      { kode_wilayah: '11', nilai: 10 },
      { kode_wilayah: '1101', provinsi: 'Aceh', nilai: 5 },
    ];
    const districtRows: DatasetRow[] = [{ kode_wilayah: '1101', provinsi: 'Aceh', nilai: 5 }];

    expect(filterRowsByRegionSelection(provinceRows, { island: 'Sumatera', provinceCode: '11' }, regions)).toEqual([provinceRows[0]]);
    expect(filterRowsByRegionSelection(districtRows, { island: 'Sumatera', provinceCode: '11' }, regions)).toEqual(districtRows);
  });
});
