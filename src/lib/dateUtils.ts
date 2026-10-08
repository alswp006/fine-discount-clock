const MS_PER_DAY = 86_400_000;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

/** 'YYYY-MM-DD'를 UTC 기준 정수 일수로 바꾼다(문자열 Date 파싱·타임존 영향 없음). */
export function ymdToDayNumber(ymd: string): number {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function dayNumberToYmd(n: number): string {
  const dt = new Date(n * MS_PER_DAY);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(ymd: string, days: number): string {
  return dayNumberToYmd(ymdToDayNumber(ymd) + days);
}

/** a - b (일) */
export function diffDays(a: string, b: string): number {
  return ymdToDayNumber(a) - ymdToDayNumber(b);
}

/** 기기 로컬 날짜. toISOString은 UTC라 하루 밀릴 수 있어 쓰지 않는다. */
export function todayYmd(): string {
  const now = new Date();
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
