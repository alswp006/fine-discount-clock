export type AmountParse =
  | { kind: 'ok'; digits: string }
  | { kind: 'reject'; reason: 'negative' | 'decimal' };

const NEGATIVE = /[-−－]/;
const DECIMAL = /[.．]/;

/** 음수 → 소수점 순으로 거부하고, 그 밖에는 숫자만 남긴다('' 가능). */
export function parseAmountInput(raw: string): AmountParse {
  if (NEGATIVE.test(raw)) return { kind: 'reject', reason: 'negative' };
  if (DECIMAL.test(raw)) return { kind: 'reject', reason: 'decimal' };
  return { kind: 'ok', digits: raw.replace(/\D/g, '') };
}

export function countChars(s: string): number {
  return Array.from(s.trim()).length;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

export function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (m < 1 || m > 12) return false;
  return d >= 1 && d <= daysInMonth(y, m);
}

/** 같은 월·일로 연도만 옮긴다. 그 날이 없으면(윤일) 그 달 말일. */
export function addYears(ymd: string, years: number): string {
  const y = Number(ymd.slice(0, 4)) + years;
  const m = Number(ymd.slice(5, 7));
  const d = Math.min(Number(ymd.slice(8, 10)), daysInMonth(y, m));
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
