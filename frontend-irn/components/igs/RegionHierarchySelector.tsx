'use client';

import { getProvinceRegions, type RegionSelection } from '@/lib/gov/region-selection';
import type { Region } from '@/lib/data/schemas';

export function RegionHierarchySelector({
  regions,
  selection,
  onChange,
}: {
  regions: Region[];
  selection: RegionSelection;
  onChange: (selection: RegionSelection) => void;
}) {
  const provinces = getProvinceRegions(regions);
  const islands = [...new Set(provinces.map((region) => region.pulau_kawasan).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'id'));
  const selectedProvince = provinces.find((region) => region.kode_wilayah === selection.provinceCode);
  const selectedIsland = selectedProvince?.pulau_kawasan ?? selection.island ?? '';
  const visibleProvinces = selectedIsland
    ? provinces.filter((region) => region.pulau_kawasan === selectedIsland)
    : [];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-500">
        Nasional / pulau
        <select
          aria-label="Pilih cakupan nasional atau pulau"
          value={selectedIsland}
          onChange={(event) => onChange({
            island: event.currentTarget.value || null,
            provinceCode: null,
          })}
          className="min-h-11 min-w-48 border border-paper-300 bg-paper-50 px-3 font-sans text-sm normal-case tracking-normal text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary"
        >
          <option value="">Nasional</option>
          {islands.map((island) => <option key={island} value={island}>{island}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-500">
        Provinsi
        <select
          aria-label="Pilih provinsi"
          value={selection.provinceCode ?? ''}
          disabled={!selectedIsland}
          onChange={(event) => onChange({
            island: selectedIsland || null,
            provinceCode: event.currentTarget.value || null,
          })}
          className="min-h-11 min-w-52 border border-paper-300 bg-paper-50 px-3 font-sans text-sm normal-case tracking-normal text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary disabled:cursor-not-allowed disabled:bg-paper-100 disabled:text-ink-400"
        >
          <option value="">{selectedIsland ? `Semua provinsi di ${selectedIsland}` : 'Pilih pulau dahulu'}</option>
          {visibleProvinces.map((province) => <option key={province.kode_wilayah} value={province.kode_wilayah}>{province.nama_daerah}</option>)}
        </select>
      </label>
    </div>
  );
}
