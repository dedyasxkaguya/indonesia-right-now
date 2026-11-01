'use client';

import { useState } from 'react';
import type { AdditionalDataset, DatasetRow, Region } from '@/lib/data/schemas';
import { NATIONAL_REGION_SELECTION, type RegionSelection } from '@/lib/gov/region-selection';
import { useGovYear } from './GovYearProvider';
import { RegionHierarchySelector } from './RegionHierarchySelector';
import { AdditionalDatasetsPanel } from './AdditionalDatasetsPanel';

export function AdditionalTopicDatasetsClient({
  datasets,
  regions,
  populationRows,
}: {
  datasets: AdditionalDataset[];
  regions: Region[];
  populationRows: DatasetRow[];
}) {
  const { year } = useGovYear();
  const [selection, setSelection] = useState<RegionSelection>(NATIONAL_REGION_SELECTION);
  if (!datasets.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-paper-300 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">WILAYAH DATA TAMBAHAN</p>
          <RegionHierarchySelector regions={regions} selection={selection} onChange={setSelection} />
        </div>
      </div>
      <AdditionalDatasetsPanel
        datasets={datasets}
        year={year}
        selection={selection}
        regions={regions}
        populationRows={populationRows}
      />
    </div>
  );
}
