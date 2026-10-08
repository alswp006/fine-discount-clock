import { describe, it, expect, beforeEach, vi } from "vitest";
// 순수 함수 테스트 — TDS·router 목 불필요. 시계는 Date만 고정한다.
import { buildOpenCards, buildSavingsHero, buildDecidedSection } from "@/lib/noticeSelectors";
import { storeErrorMessage } from "@/lib/messages";
import { readRouteState } from "@/lib/routeState";
import type { Notice } from "@/lib/types";

const TODAY = "2026-10-09";
const mk = (id: string, extra: Partial<Notice>): Notice => ({
  id,
  name: id,
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
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...extra,
});

const A = mk("A", { name: "강남 주정차", opinionDeadline: "2026-10-20", createdAt: "2026-10-01T00:00:00.000Z" });
const B = mk("B", {
  name: "출근길 속도위반",
  kind: "penalty",
  amount: 60000,
  opinionDeadline: null,
  paymentDeadline: null,
  createdAt: "2026-10-02T00:00:00.000Z",
});
const C = mk("C", { name: "마트 앞 주정차", opinionDeadline: "2026-10-11", createdAt: "2026-10-03T00:00:00.000Z" });
const PAID = mk("P", {
  name: "정리된 건",
  status: "paid_early",
  paidAmount: 32000,
  savedAmount: 8000,
  decidedAt: "2026-10-08T00:00:00.000Z",
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
});

describe("데이터 훅 useNotices·TodayContext·화면 공용 파생값·문구 맵", () => {
  it("AC-1[P0]: buildOpenCards는 C → B → A 순서이고 dueText는 32,000원/60,000원/32,000원이다", () => {
    const cards = buildOpenCards([A, B, C], TODAY);
    expect(cards.map((c) => c.id)).toEqual(["C", "B", "A"]);
    expect(cards.map((c) => c.dueText)).toEqual(["32,000원", "60,000원", "32,000원"]);
  });

  it("AC-1[P0]: 같은 dday는 createdAt 오름차순, open이 아닌 건은 제외", () => {
    const early = mk("early", { opinionDeadline: "2026-10-11", createdAt: "2026-09-01T00:00:00.000Z" });
    const cards = buildOpenCards([C, early, PAID], TODAY);
    expect(cards.map((c) => c.id)).toEqual(["early", "C"]);
  });

  it("AC-1[P0]: 기한이 지난 카드가 맨 위에 온다", () => {
    const late = mk("late", {
      receivedDate: "2026-09-20",
      opinionDeadline: "2026-10-01",
      paymentDeadline: "2026-10-08",
    });
    const cards = buildOpenCards([A, B, C, late], TODAY);
    expect(cards[0].id).toBe("late");
    expect(cards.map((c) => c.id)).toEqual(["late", "C", "B", "A"]);
  });

  it("AC-2[P0]: buildSavingsHero는 total 28000, count 3, 가장 급한 건 마트 앞 주정차 D-2", () => {
    const hero = buildSavingsHero([A, B, C], TODAY);
    expect(hero).toMatchObject({ total: 28000, count: 3, urgentName: "마트 앞 주정차", urgentDday: "D-2" });
    // paid_early가 있어도 같은 값
    expect(buildSavingsHero([A, B, C, PAID], TODAY)).toEqual(hero);
  });

  it("AC-2[P0]: open이 0건이면 null이다", () => {
    expect(buildSavingsHero([], TODAY)).toBeNull();
    expect(buildSavingsHero([PAID], TODAY)).toBeNull();
  });

  it("AC-3[P0]: buildDecidedSection은 '감경 납부 · 32,000원' 행과 savedTotal 8000을 반환한다", () => {
    const section = buildDecidedSection([A, PAID]);
    expect(section.savedTotal).toBe(8000);
    expect(section.rows).toHaveLength(1);
    expect(JSON.stringify(section.rows)).toContain("감경 납부 · 32,000원");
  });

  it("AC-4[P0]: 오류 코드별 Toast 문구", () => {
    expect(storeErrorMessage("quota")).toBe("저장 공간이 부족해 저장하지 못했어요");
    expect(storeErrorMessage("limit")).toBe("고지서는 50장까지 등록할 수 있어요");
    expect(storeErrorMessage("invalid")).toBe("입력값을 다시 확인해 주세요");
    expect(storeErrorMessage("unavailable")).toBe("저장 공간에 접근할 수 없어 저장하지 못했어요");
    expect(storeErrorMessage("newer_version")).toBe("새 버전 앱에서 저장한 데이터가 있어 저장하지 못했어요");
  });

  it("AC-5[P0]: readRouteState는 null·잘못된 값에 {}를 반환하고 throw하지 않는다", () => {
    expect(readRouteState(null)).toEqual({});
    expect(readRouteState("oops")).toEqual({});
    expect(readRouteState({ focus: "x", deletedName: 3, justSaved: "yes" })).toEqual({});
    expect(readRouteState({ justSaved: true, deletedName: "강남 주정차" })).toEqual({
      justSaved: true,
      deletedName: "강남 주정차",
    });
  });
});
