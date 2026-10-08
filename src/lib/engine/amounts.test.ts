import { describe, it, expect } from 'vitest';
import { calcDday, calcFineComparison, calcFineScenario, calcPenaltyStages } from './amounts';

describe('calcFineComparison', () => {
  it('감경 80%·정액 가산 3%를 1원 미만 버림으로 계산한다', () => {
    expect(calcFineComparison({ amount: 40000, discountedAmount: null })).toEqual({
      discounted: 32000,
      full: 40000,
      overdueFirst: 41200,
      saving: 8000,
    });
    const odd = calcFineComparison({ amount: 33333, discountedAmount: null });
    expect(odd.discounted).toBe(26666);
    expect(odd.overdueFirst).toBe(34332);
  });

  it('고지서에 적힌 감경 금액이 우선이다', () => {
    const r = calcFineComparison({ amount: 40000, discountedAmount: 30000 });
    expect(r.discounted).toBe(30000);
    expect(r.saving).toBe(10000);
  });
});

describe('calcFineScenario', () => {
  it('월 가산금을 누적하고 60개월에서 멈춘다', () => {
    const rows = calcFineScenario(40000, 61);
    expect(rows).toHaveLength(62);
    expect(rows[0]).toEqual({ month: 0, total: 41200, surcharge: 1200 });
    expect(rows[1].total).toBe(41680);
    expect(rows[12].total).toBe(46960);
    expect(rows[60]).toEqual({ month: 60, total: 70000, surcharge: 30000 });
    expect(rows[61]).toEqual({ month: 61, total: 70000, surcharge: 30000 });
  });
});

describe('calcPenaltyStages', () => {
  it('접수일 기준 1·2차 기한과 금액을 계산한다', () => {
    expect(
      calcPenaltyStages({ amount: 40000, receivedDate: '2026-10-05', paymentDeadline: null }),
    ).toEqual({
      firstDeadline: '2026-10-15',
      firstAmount: 40000,
      secondDeadline: '2026-11-04',
      secondAmount: 48000,
    });
  });

  it('납부기한이 있으면 그 날짜가 1차 기한이다', () => {
    const r = calcPenaltyStages({ amount: 40000, receivedDate: '2026-10-05', paymentDeadline: '2026-10-16' });
    expect(r.firstDeadline).toBe('2026-10-16');
    expect(r.secondDeadline).toBe('2026-11-05');
  });
});

describe('calcDday', () => {
  it('미래는 양수, 당일은 0, 과거는 음수다', () => {
    expect(calcDday('2026-10-20', '2026-10-09')).toBe(11);
    expect(calcDday('2026-10-09', '2026-10-09')).toBe(0);
    expect(calcDday('2026-10-08', '2026-10-09')).toBe(-1);
  });
});
