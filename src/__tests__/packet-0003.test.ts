import { describe, it, expect } from "vitest";
// 이 패킷은 순수 계산 함수만 다룬다(UI 없음). TDS·react-router·AppState 목은 필요 없다.
// 모든 "오늘"은 인자(today)로 받으므로 시계를 고정할 필요가 없다.
import {
  calcFineComparison,
  calcFineScenario,
  calcPenaltyStages,
  calcDday,
  getKeyDeadline,
  getLastDeadline,
  currentDueAmount,
  potentialSaving,
} from "@/lib/fineEngine";
import type { Notice } from "@/lib/types";

// 고지서 1장 픽스처 — 과태료 기본값(40000원, 의견제출 기한 10-20, 납부기한 11-30)에서 필요한 필드만 덮어쓴다
function notice(over: Partial<Notice> = {}): Notice {
  return {
    id: "test-notice",
    name: "강남 주정차",
    kind: "fine",
    amount: 40000,
    discountedAmount: null,
    receivedDate: "2026-10-05",
    opinionDeadline: "2026-10-20",
    paymentDeadline: "2026-11-30",
    status: "open",
    paidAmount: null,
    savedAmount: 0,
    decidedAt: null,
    createdAt: "2026-10-05T00:00:00+09:00",
    updatedAt: "2026-10-05T00:00:00+09:00",
    ...over,
  };
}

describe("계산 엔진 — 감경·가산금·범칙금 단계·기준 기한", () => {
  it("AC-1[P0]: calcFineComparison은 감경가·정액 체납가·절감액을 정수 버림으로 계산한다", () => {
    // 40000원: 감경 80%=32000, 가산 3%=1200 → 41200, 절감 8000
    const base = calcFineComparison(notice({ amount: 40000, discountedAmount: null }));
    expect(base).toEqual({ discounted: 32000, full: 40000, overdueFirst: 41200, saving: 8000 });
    expect(base.saving).toBe(base.full - base.discounted);
    // 33333원: 80% = 26666.4 → 26666, 3% = 999.99 → 34332 (1원 미만 버림)
    const odd = calcFineComparison(notice({ amount: 33333 }));
    expect(odd.discounted).toBe(26666);
    expect(odd.overdueFirst).toBe(34332);
  });

  it("AC-1[P0]: 고지서에 적힌 감경 금액(discountedAmount)이 있으면 계산값 대신 그 금액을 쓴다", () => {
    // 고지서 우선 원칙: 30000원이 적혀 있으면 절감액은 40000 - 30000 = 10000
    const r = calcFineComparison(notice({ amount: 40000, discountedAmount: 30000 }));
    expect(r.discounted).toBe(30000);
    expect(r.saving).toBe(10000);
  });

  it("AC-2[P0]: calcFineScenario(40000, 61)은 월별 가산금을 누적하고 60개월에서 멈춘다", () => {
    const rows = calcFineScenario(40000, 61);
    // month 0..61 → 62개 행
    expect(rows).toHaveLength(62);
    // month 0: 정액 가산 1200 → 41200
    expect(rows[0]).toEqual({ month: 0, total: 41200, surcharge: 1200 });
    // month 1: 1200 + 매월 480 = 1680 → 41680
    expect(rows[1].total).toBe(41680);
    // month 12: 1200 + 12 × 480 = 6960 → 46960
    expect(rows[12].total).toBe(46960);
    // month 60: 1200 + 60 × 480 = 30000 → 70000 (상한 도달)
    expect(rows[60]).toEqual({ month: 60, total: 70000, surcharge: 30000 });
    // month 61: 60개월 초과분은 가산하지 않으므로 60과 같다
    expect(rows[61]).toEqual({ month: 61, total: 70000, surcharge: 30000 });
  });

  it("AC-3[P0]: calcPenaltyStages는 접수일 기준 1·2차 기한과 금액을 계산하고, 납부기한이 있으면 그 날짜를 1차로 쓴다", () => {
    // 접수 10-05 → 1차 기한 10-15(첫날 불산입 10일), 2차 기한 11-04(+20일), 2차 금액 40000 × 1.2 = 48000
    const base = calcPenaltyStages(
      notice({ kind: "penalty", amount: 40000, receivedDate: "2026-10-05", opinionDeadline: null, paymentDeadline: null }),
    );
    expect(base).toEqual({
      firstDeadline: "2026-10-15",
      firstAmount: 40000,
      secondDeadline: "2026-11-04",
      secondAmount: 48000,
    });
    // 고지서에 납부기한 10-16이 적혀 있으면 1차는 10-16, 2차는 그로부터 20일 뒤 11-05
    const withPayment = calcPenaltyStages(
      notice({ kind: "penalty", amount: 40000, receivedDate: "2026-10-05", opinionDeadline: null, paymentDeadline: "2026-10-16" }),
    );
    expect(withPayment.firstDeadline).toBe("2026-10-16");
    expect(withPayment.secondDeadline).toBe("2026-11-05");
  });

  it("AC-4[P0]: getKeyDeadline은 오늘 이후 가장 이른 기한을 주고, calcDday는 날짜 차이(일)를 준다", () => {
    const n = notice(); // 의견제출 10-20, 납부기한 11-30
    // today 10-20: 감경 마감 당일 → dday 0
    const onOpinion = getKeyDeadline(n, "2026-10-20");
    expect(onOpinion).toMatchObject({ label: "감경 마감", date: "2026-10-20", dday: 0 });
    // today 10-21: 감경 마감이 지났으므로 납부기한 11-30, 10일 + 30일 = 40
    expect(getKeyDeadline(n, "2026-10-21")).toEqual({ label: "납부기한", date: "2026-11-30", dday: 40 });
    // calcDday: 미래 +11, 당일 0, 과거 -1 (today 10-09 기준)
    expect(calcDday("2026-10-20", "2026-10-09")).toBe(11);
    expect(calcDday("2026-10-09", "2026-10-09")).toBe(0);
    expect(calcDday("2026-10-08", "2026-10-09")).toBe(-1);
  });

  it("AC-4[P0]: 모든 기한이 지나면 getKeyDeadline은 null이고 getLastDeadline의 dday는 음수다", () => {
    const n = notice(); // 납부기한 11-30
    // today 12-01: 남은 기한이 없으므로 null
    expect(getKeyDeadline(n, "2026-12-01")).toBeNull();
    // 마지막 기한(납부기한 11-30)은 하루 지난 것 → dday -1
    expect(getLastDeadline(n, "2026-12-01")).toEqual({ label: "납부기한", date: "2026-11-30", dday: -1 });
  });

  it("AC-5[P0]: currentDueAmount·potentialSaving은 과태료 기한 구간별 금액을 따른다", () => {
    const n = notice(); // 40000원, 의견제출 10-20, 납부기한 11-30
    // 감경 기간 안(10-09): 지금 낼 금액 32000, 아낄 금액 8000
    expect(currentDueAmount(n, "2026-10-09")).toBe(32000);
    expect(potentialSaving(n, "2026-10-09")).toBe(8000);
    // 감경 마감 후(10-21): 정액 40000, 아낄 금액 1200(= 체납가 41200 - 40000)
    expect(currentDueAmount(n, "2026-10-21")).toBe(40000);
    expect(potentialSaving(n, "2026-10-21")).toBe(1200);
    // 모든 기한 경과(12-01): 체납 가산 41200, 아낄 금액 0
    expect(currentDueAmount(n, "2026-12-01")).toBe(41200);
    expect(potentialSaving(n, "2026-12-01")).toBe(0);
  });

  it("AC-5[P0]: 범칙금 1·2차 구간값과, 의견제출 기한이 없는 과태료는 감경가를 쓰지 않는다", () => {
    // 범칙금 60000, 접수 10-05 → 1차 기한 10-15, 2차 금액 72000
    const penalty = notice({ kind: "penalty", amount: 60000, receivedDate: "2026-10-05", opinionDeadline: null, paymentDeadline: null });
    // 1차 기간(10-09): 60000원 납부, 2차로 가면 12000 더 낸다 → 아낄 금액 12000
    expect(currentDueAmount(penalty, "2026-10-09")).toBe(60000);
    expect(potentialSaving(penalty, "2026-10-09")).toBe(12000);
    // 2차 기간(10-16): 72000원, 더 아낄 것 없음
    expect(currentDueAmount(penalty, "2026-10-16")).toBe(72000);
    expect(potentialSaving(penalty, "2026-10-16")).toBe(0);
    // 의견제출 기한이 null인 과태료: discountedAmount 30000이 있어도 감경가를 쓰지 않고 정액 40000
    const noOpinion = notice({ amount: 40000, discountedAmount: 30000, opinionDeadline: null });
    expect(currentDueAmount(noOpinion, "2026-10-09")).toBe(40000);
    expect(potentialSaving(noOpinion, "2026-10-09")).toBe(1200);
  });
});
