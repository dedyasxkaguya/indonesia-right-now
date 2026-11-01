export function populationWeightedAverage(
  values: { value: number; population: number }[],
): number {
  const valid = values.filter((entry) => (
    Number.isFinite(entry.value)
    && Number.isFinite(entry.population)
    && entry.population > 0
  ));
  if (!valid.length) return Number.NaN;
  const totalPop = valid.reduce((sum, entry) => sum + entry.population, 0);
  return valid.reduce((sum, entry) => sum + entry.value * entry.population, 0) / totalPop;
}
