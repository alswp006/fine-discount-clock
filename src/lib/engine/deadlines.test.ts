import { describe, it, expect } from 'vitest';
import type { Notice } from '@/lib/types';
import {
  calcDecisionRecord,
  currentDueAmount,
  getKeyDeadline,
  getLastDeadline,
  potentialSaving,
} from './deadlines';

function notice(over: Partial<Notice> = {}): Notice {
  return {
    id: 'n1',
    name: '강남 주정차',
    kind: 'fine',
    amount: 40000,
    discountedAmount: null,
    receivedDate: '2026-10-05',
    opinionDeadline: '2026-10-20',
    paymentDeadline: '2026-11-30',
    status: 'open',
    paidAmount: null,
    savedAmount: 0,
    decidedAt: null,
    createdAt: '2026-10-05T00:00:00+09:00',
    updatedAt: '2026-10-05T00:00:00+09:00',
    ...over,
  };
}

const penalty = (over: Partial<Notice> = {}) =>
  notice({ kind: 'penalty', amount: 60000, opinionDeadline: null, paymentDeadline: null, ...over });

describe('getKeyDeadline / getLastDeadline', () => {
  it('오늘 이후 가장 이른 기한을 준다', () => {
    expect(getKeyDeadline(notice(), '2026-10-20')).toEqual({ label: '감경 마감', date: '2026-10-20', dday: 0 });
    expect(getKeyDeadline(notice(), '2026-10-21')).toEqual({ label: '납부기한', date: '2026-11-30', dday: 40 });
  });

  it('모든 기한이 지나면 null이고 마지막 기한의 dday는 음수다', () => {
    expect(getKeyDeadline(notice(), '2026-12-01')).toBeNull();
    expect(getLastDeadline(notice(), '2026-12-01')).toEqual({ label: '납부기한', date: '2026-11-30', dday: -1 });
  });

  it('의견제출 기한이 없는 과태료는 감경 단계를 건너뛴다', () => {
    expect(getKeyDeadline(notice({ opinionDeadline: null }), '2026-10-09')?.label).toBe('납부기한');
  });

  it('범칙금은 1·2차 납부기한을 차례로 준다', () => {
    expect(getKeyDeadline(penalty(), '2026-10-09')).toMatchObject({ label: '1차 납부기한', date: '2026-10-15' });
    expect(getKeyDeadline(penalty(), '2026-10-16')).toMatchObject({ label: '2차 납부기한', date: '2026-11-04' });
  });
});

describe('currentDueAmount / potentialSaving', () => {
  it('과태료 구간별 금액', () => {
    const n = notice();
    expect([currentDueAmount(n, '2026-10-09'), potentialSaving(n, '2026-10-09')]).toEqual([32000, 8000]);
    expect([currentDueAmount(n, '2026-10-21'), potentialSaving(n, '2026-10-21')]).toEqual([40000, 1200]);
    expect([currentDueAmount(n, '2026-12-01'), potentialSaving(n, '2026-12-01')]).toEqual([41200, 0]);
  });

  it('범칙금 1·2차 구간 금액', () => {
    expect([currentDueAmount(penalty(), '2026-10-09'), potentialSaving(penalty(), '2026-10-09')]).toEqual([60000, 12000]);
    expect([currentDueAmount(penalty(), '2026-10-16'), potentialSaving(penalty(), '2026-10-16')]).toEqual([72000, 0]);
  });

  it('의견제출 기한이 없으면 감경가를 쓰지 않는다', () => {
    const n = notice({ discountedAmount: 30000, opinionDeadline: null });
    expect(currentDueAmount(n, '2026-10-09')).toBe(40000);
    expect(potentialSaving(n, '2026-10-09')).toBe(1200);
  });
});

describe('calcDecisionRecord', () => {
  it('감경 기간 납부는 체납 1차 금액과의 차이를 절감액으로 기록한다', () => {
    expect(calcDecisionRecord(notice(), 'paid_early', '2026-10-09')).toEqual({
      status: 'paid_early',
      paidAmount: 32000,
      savedAmount: 9200,
      decidedAt: '2026-10-09',
    });
  });

  it('기한 경과 후 납부는 절감액이 0이다', () => {
    expect(calcDecisionRecord(notice(), 'paid_late', '2026-12-01')).toMatchObject({ paidAmount: 41200, savedAmount: 0 });
  });

  it('이의제기는 낸 금액이 없다', () => {
    expect(calcDecisionRecord(notice(), 'objected', '2026-10-09')).toMatchObject({ paidAmount: null, savedAmount: 0 });
  });
});
