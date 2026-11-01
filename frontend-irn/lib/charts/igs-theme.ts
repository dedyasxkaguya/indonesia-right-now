export const IGS_PALETTE = {
  navy: '#0E4A6F',
  cyan: '#0891B2',
  canvas: '#F7F3EC',
  card: '#FDFBF6',
  hairline: '#D9D2C4',
  amber: '#B45309',
  ink: '#141414',
  muted: '#57534E',
} as const;

export const IGS_SERIES_COLORS: string[] = [
  IGS_PALETTE.navy,
  IGS_PALETTE.cyan,
  IGS_PALETTE.amber,
  '#6B7280',
  '#387A63',
  '#875B87',
];

const monoFont = '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace';

// Deliberately loose: consumers spread these fragments straight into typed EChartsOption literals.
export function igsAxis(extra?: Record<string, unknown>): any {
  return {
    axisLine: { lineStyle: { color: IGS_PALETTE.hairline } },
    axisTick: { lineStyle: { color: IGS_PALETTE.hairline } },
    axisLabel: { color: IGS_PALETTE.muted, fontFamily: monoFont, fontSize: 11 },
    splitLine: { lineStyle: { color: '#EFE9DC' } },
    ...extra,
  };
}

export function igsTooltip(extra?: Record<string, unknown>): any {
  return {
    backgroundColor: IGS_PALETTE.card,
    borderColor: IGS_PALETTE.hairline,
    borderWidth: 1,
    textStyle: { color: IGS_PALETTE.ink, fontFamily: monoFont, fontSize: 12 },
    ...extra,
  };
}

export function igsAxisLabel(extra?: Record<string, unknown>): any {
  return {
    color: IGS_PALETTE.muted,
    fontFamily: monoFont,
    fontSize: 11,
    ...extra,
  };
}

export function igsLegend(extra?: Record<string, unknown>): any {
  return {
    textStyle: { color: IGS_PALETTE.muted, fontFamily: monoFont, fontSize: 11 },
    itemStyle: { borderWidth: 0 },
    pageTextStyle: { color: IGS_PALETTE.muted },
    ...extra,
  };
}
