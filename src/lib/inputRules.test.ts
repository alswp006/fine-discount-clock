import { describe, it, expect } from 'vitest';
import { parseAmountInput, countChars, addYears, isValidYmd } from '@/lib/inputRules';

describe('parseAmountInput', () => {
  it.each([
    ['40,000원', { kind: 'ok', digits: '40000' }],
    ['4만원', { kind: 'ok', digits: '4' }],
    ['@#$%', { kind: 'ok', digits: '' }],
    ['40000.5', { kind: 'reject', reason: 'decimal' }],
    ['40.000', { kind: 'reject', reason: 'decimal' }],
    ['．', { kind: 'reject', reason: 'decimal' }],
    ['-5000', { kind: 'reject', reason: 'negative' }],
    ['−5000', { kind: 'reject', reason: 'negative' }],
    ['－5000', { kind: 'reject', reason: 'negative' }],
    ['-40000.5', { kind: 'reject', reason: 'negative' }],
  ])('%s', (raw, expected) => {
    expect(parseAmountInput(raw)).toEqual(expected);
  });
});

describe('countChars', () => {
  it('코드포인트 기준으로 센다', () => {
    expect(countChars('🚗'.repeat(20))).toBe(20);
    expect(countChars('🚗'.repeat(21))).toBe(21);
    expect(countChars('  강남 주정차  ')).toBe(6);
  });
});

describe('addYears', () => {
  it('연도만 옮기고 없는 날은 말일로 맞춘다', () => {
    expect(addYears('2026-10-09', -5)).toBe('2021-10-09');
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28');
    expect(addYears('2026-10-05', 1)).toBe('2027-10-05');
  });
});

describe('isValidYmd', () => {
  it.each([
    ['2028-02-29', true],
    ['2026-12-31', true],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-04-31', false],
    ['2026-13-01', false],
    ['2026-00-10', false],
    ['2026-10-00', false],
    ['2026-1-05', false],
    ['20261005', false],
    ['', false],
  ])('%s → %s', (s, expected) => {
    expect(isValidYmd(s)).toBe(expected);
  });
});
