import { describe, it, expect, expectTypeOf } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// 이 패킷은 UI가 없다(타입·상수만). 렌더 목(TDS·react-router·AppState)은 필요 없다.
import * as types from "@/lib/types";
import type {
  Notice,
  NoticeInput,
  NoticeKind,
  NoticeStatus,
  KeyDeadline,
  FineComparison,
  FineScenarioRow,
  PenaltyStages,
  LoadResult,
  StoreError,
  RouteState,
} from "@/lib/types";
import { FINE_RULES, PENALTY_RULES, INPUT_LIMITS } from "@/lib/fineRules";

const readSource = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("엔티티·결과·RouteState 타입과 법령 기준 상수", () => {
  it("AC-1[P0]: types.ts는 런타임 export가 0개이고 함수·const·class 선언이 없다", () => {
    // tsc 출력(JS)이 비어야 하므로 모듈 namespace에 값이 없어야 한다
    expect(Object.keys(types)).toHaveLength(0);
    const src = readSource("../lib/types.ts");
    expect(src).not.toMatch(/^\s*export\s+(const|let|var|function|class|enum)\b/m);
    expect(src).not.toMatch(/^\s*(function|class)\s+\w+/m);
  });

  it("AC-2[P0]: StoreError는 7개 리터럴의 유니온이다", () => {
    expectTypeOf<StoreError>().toEqualTypeOf<
      'quota' | 'unavailable' | 'limit' | 'not_found' | 'unbacked' | 'newer_version' | 'invalid'
    >();
    // 런타임에서도 7개 값을 모두 대입할 수 있어야 한다(철자 오류는 tsc가 잡는다)
    const all: StoreError[] = ['quota', 'unavailable', 'limit', 'not_found', 'unbacked', 'newer_version', 'invalid'];
    expect(new Set(all).size).toBe(7);
    expect(all).toContain('newer_version');
  });

  it("AC-3[P0]: LoadResult는 notices·corrupted·backupFailed·unavailable·newerVersion 5개 필드를 가진다", () => {
    expectTypeOf<keyof LoadResult>().toEqualTypeOf<
      'notices' | 'corrupted' | 'backupFailed' | 'unavailable' | 'newerVersion'
    >();
    expectTypeOf<LoadResult['notices']>().toEqualTypeOf<Notice[]>();
    // 손상이 아니라 새 버전으로 판정된 경우의 값 조합
    const newer: LoadResult = { notices: [], corrupted: false, backupFailed: false, unavailable: false, newerVersion: true };
    expect(Object.keys(newer).sort()).toEqual(['backupFailed', 'corrupted', 'newerVersion', 'notices', 'unavailable']);
    expect(newer.newerVersion).toBe(true);
    expect(newer.corrupted).toBe(false);
  });

  it("AC-4[P1]: RouteState는 justSaved·focus·deletedName 세 키를 가진 선택 필드 객체다", () => {
    expectTypeOf<RouteState>().toEqualTypeOf<{
      justSaved?: boolean;
      focus?: 'paymentDeadline';
      deletedName?: string;
    }>();
    const state: RouteState = { justSaved: true, focus: 'paymentDeadline', deletedName: '강남 주정차' };
    expect(state.focus).toBe('paymentDeadline');
    expect(state.deletedName).toBe('강남 주정차');
    // 잘못된 값은 컴파일 에러여야 한다(기대 에러가 없으면 tsc가 빨개진다)
    // @ts-expect-error focus는 'paymentDeadline' 하나뿐이다
    const badFocus: RouteState = { focus: 'amount' };
    // @ts-expect-error deletedName은 문자열이다
    const badName: RouteState = { deletedName: 3 };
    expect(badFocus.focus).toBe('amount');
    expect(badName.deletedName).toBe(3);
  });

  it("AC-5[P0]: fineRules 상수 값이 SPEC과 같다", () => {
    expect(FINE_RULES).toEqual({
      DISCOUNT_PERCENT: 20,
      SURCHARGE_PERCENT: 3,
      HEAVY_SURCHARGE_PERMILLE: 12,
      HEAVY_SURCHARGE_MAX_MONTHS: 60,
    });
    expect(PENALTY_RULES).toEqual({
      FIRST_PERIOD_DAYS: 10,
      SECOND_PERIOD_DAYS: 20,
      SECOND_SURCHARGE_PERCENT: 20,
    });
    expect(INPUT_LIMITS).toEqual({
      AMOUNT_MIN: 1_000,
      AMOUNT_MAX: 10_000_000,
      NAME_MAX_CHARS: 20,
      RECEIVED_MAX_YEARS_AGO: 5,
      DEADLINE_MAX_YEARS_AFTER_RECEIVED: 1,
      MAX_NOTICES: 50,
    });
  });

  it("AC-5[P0]: 법령 상수마다 조문 출처 주석이 붙어 있다", () => {
    const src = readSource("../lib/fineRules.ts");
    const lineOf = (key: string) => {
      const line = src.split("\n").find((l) => l.trim().startsWith(`${key}:`));
      expect(line, `${key} 줄이 fineRules.ts에 있어야 한다`).toBeDefined();
      return line ?? "";
    };
    // 주석 안에 "제N조" 형태의 조문 번호가 있어야 한다
    for (const key of [
      'DISCOUNT_PERCENT', 'SURCHARGE_PERCENT', 'HEAVY_SURCHARGE_PERMILLE', 'HEAVY_SURCHARGE_MAX_MONTHS',
      'FIRST_PERIOD_DAYS', 'SECOND_PERIOD_DAYS', 'SECOND_SURCHARGE_PERCENT',
    ]) {
      expect(lineOf(key)).toMatch(/\/\/.*제\d+조/);
    }
    // INPUT_LIMITS는 법정 기준이 아니므로 조문 대신 "법정 기준 아님" 취지의 주석이 있어야 한다
    expect(src).toMatch(/법정 기준/);
  });

  it("Notice·NoticeInput·상태 유니온이 SPEC 필드와 같다", () => {
    expectTypeOf<NoticeKind>().toEqualTypeOf<'fine' | 'penalty'>();
    expectTypeOf<NoticeStatus>().toEqualTypeOf<'open' | 'paid_early' | 'paid_late' | 'objected'>();
    expectTypeOf<keyof Notice>().toEqualTypeOf<
      'id' | 'name' | 'kind' | 'amount' | 'discountedAmount' | 'receivedDate' | 'opinionDeadline' |
      'paymentDeadline' | 'status' | 'paidAmount' | 'savedAmount' | 'decidedAt' | 'createdAt' | 'updatedAt'
    >();
    expectTypeOf<NoticeInput>().toEqualTypeOf<
      Pick<Notice, 'name' | 'kind' | 'amount' | 'discountedAmount' | 'receivedDate' | 'opinionDeadline' | 'paymentDeadline'>
    >();
    // 계산 결과 타입 4종도 같이 확인한다(저장하지 않는 파생값)
    const deadline: KeyDeadline = { date: '2026-10-20', label: '감경 마감', dday: 11 };
    const cmp: FineComparison = { discounted: 32000, full: 40000, overdueFirst: 41200, saving: 8000 };
    const row: FineScenarioRow = { month: 0, total: 41200, surcharge: 1200 };
    const stages: PenaltyStages = { firstDeadline: '2026-10-19', firstAmount: 30000, secondDeadline: '2026-11-08', secondAmount: 36000 };
    expect(deadline.dday).toBe(11);
    expect(cmp.saving).toBe(cmp.full - cmp.discounted);
    expect(row.total - row.surcharge).toBe(40000);
    expect(stages.secondAmount).toBe(36000);
  });
});
