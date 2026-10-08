import { describe, it, expect, vi } from 'vitest';
import { addDays, diffDays, todayYmd } from '@/lib/dateUtils';
import { formatDateDot, formatDday, formatWon } from '@/lib/format';

describe('날짜 산술', () => {
  it('addDays', () => {
    expect(addDays('2026-10-05', 10)).toBe('2026-10-15');
    expect(addDays('2026-10-15', 20)).toBe('2026-11-04');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('diffDays', () => {
    expect(diffDays('2026-10-20', '2026-10-09')).toBe(11);
    expect(diffDays('2026-11-30', '2026-10-09')).toBe(52);
    expect(diffDays('2026-10-09', '2026-10-20')).toBe(-11);
  });

  it('todayYmd는 로컬 날짜를 쓴다', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 9, 0, 1, 0));
    expect(todayYmd()).toBe('2026-10-09');
    vi.setSystemTime(new Date(2026, 9, 9, 23, 59, 0));
    expect(todayYmd()).toBe('2026-10-09');
  });
});

describe('표시 포맷', () => {
  it('formatDateDot 요일', () => {
    expect(formatDateDot('2026-10-20')).toBe('2026.10.20(화)');
    expect(formatDateDot('2026-11-30')).toBe('2026.11.30(월)');
    expect(formatDateDot('2026-10-15')).toBe('2026.10.15(목)');
    expect(formatDateDot('2026-11-04')).toBe('2026.11.04(수)');
    expect(formatDateDot('1969-12-31')).toBe('1969.12.31(수)');
  });

  it('formatDday', () => {
    expect(formatDday(0)).toBe('D-DAY');
    expect(formatDday(11)).toBe('D-11');
    expect(formatDday(-1)).toBe('D+1');
  });

  it('formatWon', () => {
    expect(formatWon(32000)).toBe('32,000원');
    expect(formatWon(0)).toBe('0원');
  });
});
