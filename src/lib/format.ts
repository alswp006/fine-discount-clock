import { ymdToDayNumber } from '@/lib/dateUtils';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** '2026-10-20' → '2026.10.20(화)' */
export function formatDateDot(ymd: string): string {
  // 1970-01-01(목) 기준 요일
  const weekday = WEEKDAYS[(((ymdToDayNumber(ymd) + 4) % 7) + 7) % 7];
  return `${ymd.slice(0, 4)}.${ymd.slice(5, 7)}.${ymd.slice(8, 10)}(${weekday})`;
}

/** 마감일까지 남은 일수 → 'D-11' / 'D-DAY' / 'D+1' */
export function formatDday(days: number): string {
  if (days === 0) return 'D-DAY';
  return days > 0 ? `D-${days}` : `D+${-days}`;
}
