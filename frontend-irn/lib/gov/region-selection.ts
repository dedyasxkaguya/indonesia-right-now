import type { DatasetRow, Region } from '../data/schemas';

export type RegionSelection = {
  island: string | null;
  provinceCode: string | null;
};

export const NATIONAL_REGION_SELECTION: RegionSelection = {
  island: null,
  provinceCode: null,
};

function isProvince(region: Region) {
  const level = region.tingkat_pemerintahan.toLocaleLowerCase('id-ID');
  return level === 'provinsi' || region.provinsi === region.nama_daerah;
}

export function getProvinceRegions(regions: Region[]) {
  return regions
    .filter(isProvince)
    .sort((a, b) => a.nama_daerah.localeCompare(b.nama_daerah, 'id'));
}

function provinceMatchesRow(row: DatasetRow, province: Region, regions: Region[]) {
  const rowCode = String(row.kode_wilayah ?? '');
  if (rowCode === province.kode_wilayah) return true;
  const rowRegion = regions.find((region) => region.kode_wilayah === rowCode);
  const rowProvince = String(row.provinsi ?? rowRegion?.provinsi ?? '');
  return rowProvince.localeCompare(province.nama_daerah, 'id', { sensitivity: 'base' }) === 0;
}

export function filterRowsByRegionSelection<T extends DatasetRow>(
  rows: T[],
  selection: RegionSelection,
  regions: Region[],
): T[] {
  if (!selection.island && !selection.provinceCode) return rows;

  const provinces = getProvinceRegions(regions);
  if (selection.provinceCode) {
    const province = provinces.find((region) => region.kode_wilayah === selection.provinceCode);
    if (!province) return [];
    const exactRows = rows.filter((row) => String(row.kode_wilayah ?? '') === province.kode_wilayah);
    return exactRows.length ? exactRows : rows.filter((row) => provinceMatchesRow(row, province, regions));
  }

  const islandProvinces = provinces.filter((province) => province.pulau_kawasan === selection.island);
  const provinceCodes = new Set(islandProvinces.map((province) => province.kode_wilayah));
  const provinceRows = rows.filter((row) => provinceCodes.has(String(row.kode_wilayah ?? '')));
  if (provinceRows.length) return provinceRows;

  return rows.filter((row) => {
    const rowCode = String(row.kode_wilayah ?? '');
    const rowRegion = regions.find((region) => region.kode_wilayah === rowCode);
    const rowIsland = String(row.pulau_kawasan ?? rowRegion?.pulau_kawasan ?? '');
    if (rowIsland === selection.island) return true;
    return islandProvinces.some((province) => provinceMatchesRow(row, province, regions));
  });
}

export function getRegionSelectionName(selection: RegionSelection, regions: Region[]) {
  if (selection.provinceCode) {
    return getProvinceRegions(regions).find((region) => region.kode_wilayah === selection.provinceCode)?.nama_daerah
      ?? 'Provinsi terpilih';
  }
  return selection.island ? `Agregat Pulau ${selection.island}` : 'Agregat Nasional';
}
