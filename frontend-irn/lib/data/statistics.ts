import { getMetricValue } from './format';
import type { DatasetRow } from './schemas';

export function pearsonCorrelation(rows: DatasetRow[], left: string, right: string) {
  const pairs = rows.flatMap((row) => {
    const x = getMetricValue(row, left as Parameters<typeof getMetricValue>[1]);
    const y = getMetricValue(row, right as Parameters<typeof getMetricValue>[1]);
    return x === null || y === null ? [] : [{ x, y }];
  });
  if (pairs.length < 2) return null;
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  const numerator = pairs.reduce((sum, pair) => sum + (pair.x - meanX) * (pair.y - meanY), 0);
  const denominator = Math.sqrt(
    pairs.reduce((sum, pair) => sum + (pair.x - meanX) ** 2, 0)
    * pairs.reduce((sum, pair) => sum + (pair.y - meanY) ** 2, 0),
  );
  return denominator ? numerator / denominator : null;
}
