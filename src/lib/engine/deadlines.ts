import type { KeyDeadline, Notice, NoticeStatus } from '@/lib/types';
import { calcDday, calcFineComparison, calcPenaltyStages } from './amounts';

/** 고지서의 기한을 이른 순서로 나열한다. 의견제출 기한이 없으면 감경 단계는 건너뛴다. */
function listDeadlines(notice: Notice, today: string): KeyDeadline[] {
  const make = (date: string, label: KeyDeadline['label']): KeyDeadline => ({
    date,
    label,
    dday: calcDday(date, today),
  });
  if (notice.kind === 'penalty') {
    const stages = calcPenaltyStages(notice);
    return [make(stages.firstDeadline, '1차 납부기한'), make(stages.secondDeadline, '2차 납부기한')];
  }
  const list: KeyDeadline[] = [];
  if (notice.opinionDeadline) list.push(make(notice.opinionDeadline, '감경 마감'));
  if (notice.paymentDeadline) list.push(make(notice.paymentDeadline, '납부기한'));
  return list;
}

/** 오늘 이후(당일 포함) 가장 이른 기한. 남은 기한이 없으면 null */
export function getKeyDeadline(notice: Notice, today: string): KeyDeadline | null {
  return listDeadlines(notice, today).find((d) => d.dday >= 0) ?? null;
}

/** 가장 마지막 기한(이미 지났으면 dday가 음수). 기한이 하나도 없으면 null */
export function getLastDeadline(notice: Notice, today: string): KeyDeadline | null {
  const list = listDeadlines(notice, today);
  return list.length > 0 ? list[list.length - 1] : null;
}

interface DueSnapshot {
  due: number;
  saving: number;
}

function dueSnapshot(notice: Notice, today: string): DueSnapshot {
  if (notice.kind === 'penalty') {
    const s = calcPenaltyStages(notice);
    if (calcDday(s.firstDeadline, today) >= 0) {
      return { due: s.firstAmount, saving: s.secondAmount - s.firstAmount };
    }
    return { due: s.secondAmount, saving: 0 };
  }
  const c = calcFineComparison(notice);
  if (notice.opinionDeadline && calcDday(notice.opinionDeadline, today) >= 0) {
    return { due: c.discounted, saving: c.saving };
  }
  if (!notice.paymentDeadline || calcDday(notice.paymentDeadline, today) >= 0) {
    return { due: c.full, saving: c.overdueFirst - c.full };
  }
  return { due: c.overdueFirst, saving: 0 };
}

/** 오늘 내야 하는 금액 */
export function currentDueAmount(notice: Notice, today: string): number {
  return dueSnapshot(notice, today).due;
}

/** 오늘 안에 처리하면 아낄 수 있는 금액(다음 구간으로 넘어갈 때 늘어나는 금액) */
export function potentialSaving(notice: Notice, today: string): number {
  return dueSnapshot(notice, today).saving;
}

export interface DecisionRecord {
  status: NoticeStatus;
  paidAmount: number | null;
  savedAmount: number;
  decidedAt: string;
}

/**
 * 처리 상태를 기록할 때 저장할 값.
 * 납부(paid_early·paid_late)는 오늘 내야 하는 금액을 낸 것으로 보고, 절감액은 기한을 모두 넘겼을 때의
 * 금액(과태료는 체납 1차가, 범칙금은 2차 금액)과의 차이다. 이의제기는 낸 금액도 아낀 금액도 없다.
 */
export function calcDecisionRecord(
  notice: Notice,
  status: Exclude<NoticeStatus, 'open'>,
  today: string,
): DecisionRecord {
  if (status === 'objected') {
    return { status, paidAmount: null, savedAmount: 0, decidedAt: today };
  }
  const paidAmount = currentDueAmount(notice, today);
  const worst =
    notice.kind === 'penalty'
      ? calcPenaltyStages(notice).secondAmount
      : calcFineComparison(notice).overdueFirst;
  return { status, paidAmount, savedAmount: Math.max(0, worst - paidAmount), decidedAt: today };
}
