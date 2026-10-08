import { addDays, diffDays } from '@/lib/dateUtils';
import { FINE_RULES, PENALTY_RULES } from '@/lib/fineRules';
import type { FineComparison, FineScenarioRow, Notice, PenaltyStages } from '@/lib/types';

const PERCENT = 100;
const PERMILLE = 1000;

/** amount의 percent% — 1원 미만 버림 */
function percentOf(amount: number, percent: number): number {
  return Math.floor((amount * percent) / PERCENT);
}

/** 정액 가산금(납부기한 다음 날 부과) */
function baseSurcharge(amount: number): number {
  return percentOf(amount, FINE_RULES.SURCHARGE_PERCENT);
}

/** 감경·정액·체납 1차 금액 비교. 고지서에 감경 금액이 적혀 있으면 그 금액이 우선이다. */
export function calcFineComparison(
  notice: Pick<Notice, 'amount' | 'discountedAmount'>,
): FineComparison {
  const full = notice.amount;
  const discounted =
    notice.discountedAmount ?? percentOf(full, PERCENT - FINE_RULES.DISCOUNT_PERCENT);
  return {
    discounted,
    full,
    overdueFirst: full + baseSurcharge(full),
    saving: full - discounted,
  };
}

/** 납부기한 다음 날(month 0)부터 months개월까지의 가산금 누적. 상한 개월을 넘으면 더 쌓이지 않는다. */
export function calcFineScenario(amount: number, months: number): FineScenarioRow[] {
  const first = baseSurcharge(amount);
  const monthly = Math.floor((amount * FINE_RULES.HEAVY_SURCHARGE_PERMILLE) / PERMILLE);
  const rows: FineScenarioRow[] = [];
  for (let month = 0; month <= months; month++) {
    const counted = Math.min(month, FINE_RULES.HEAVY_SURCHARGE_MAX_MONTHS);
    const surcharge = first + counted * monthly;
    rows.push({ month, total: amount + surcharge, surcharge });
  }
  return rows;
}

/** 범칙금 1·2차 납부 기한과 금액. 고지서 납부기한이 있으면 그 날짜가 1차 기한이다. */
export function calcPenaltyStages(
  notice: Pick<Notice, 'amount' | 'receivedDate' | 'paymentDeadline'>,
): PenaltyStages {
  const firstDeadline =
    notice.paymentDeadline ?? addDays(notice.receivedDate, PENALTY_RULES.FIRST_PERIOD_DAYS);
  return {
    firstDeadline,
    firstAmount: notice.amount,
    secondDeadline: addDays(firstDeadline, PENALTY_RULES.SECOND_PERIOD_DAYS),
    secondAmount: notice.amount + percentOf(notice.amount, PENALTY_RULES.SECOND_SURCHARGE_PERCENT),
  };
}

/** date - today (일). 미래 양수, 당일 0, 과거 음수 */
export function calcDday(date: string, today: string): number {
  return diffDays(date, today);
}
