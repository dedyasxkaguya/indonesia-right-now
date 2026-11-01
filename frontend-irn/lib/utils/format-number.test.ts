import { describe, expect, it } from 'vitest';
import { formatDecimal, formatRupiahByUnit } from './format-number';

describe('number formatting', () => {
  it('caps requested decimal precision at four places', () => {
    expect(formatDecimal(1.123456, 9)).toBe('1,1235');
  });

  it('converts source currency units before compact and full formatting', () => {
    expect(formatRupiahByUnit(76115492.9, 'ribu Rp')).toBe('Rp 76,1 M');
    expect(formatRupiahByUnit(76115492.9, 'ribu Rp', 'full')).toBe('Rp 76.115.492.900');
  });
});
