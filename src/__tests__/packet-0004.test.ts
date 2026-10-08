import { describe, it, expect } from "vitest";
// 이 패킷은 순수 검증·판정·해석 함수만 다룬다(UI 없음). TDS·react-router·AppState 목은 필요 없다.
// validateNotices는 "오늘" 날짜에 의존하지 않는다(로드 검증 규칙 — 5년 하한·받은 날 ≤ 오늘은 쓰지 않는다).
// 따라서 시계를 고정할 필요가 없다.
import {
  validateNotices,
  migrateNoticesData,
  parseCorruptBackup,
  CURRENT_SCHEMA_VERSION,
} from "@/lib/noticeSchema";
import type { NoticeMigrations } from "@/lib/noticeSchema";
import { classifyStoredData } from "@/lib/schema/versioning";
import type { Notice } from "@/lib/types";

// 기준 항목 B (SPEC F1-AC-15) — 과태료, 미처리, 기한 모두 있음. 변형 테스트는 이 값에서 필드 하나만 바꾼다
const B: Notice = {
  id: "a1",
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
  createdAt: "2026-10-09T01:00:00.000Z",
  updatedAt: "2026-10-09T01:00:00.000Z",
};

// 최상위 값 {version, notices} 래퍼
const wrap = (...notices: unknown[]) => ({ version: 1, notices });

describe("스키마 검증·버전 판정·마이그레이션·백업 해석", () => {
  it("AC-1[P0]: 기준 항목 B와 2019년 날짜의 B는 [B]로 통과하고, 기한 둘 다 null이거나 기한이 역전된 과태료는 null이다", () => {
    // 기준 항목 B는 그대로 [B]를 돌려준다
    expect(validateNotices(wrap(B))).toEqual([B]);
    // 날짜를 2019년으로 바꿔도 통과한다(오늘 기준 규칙을 쓰지 않는다는 뜻)
    const old = { ...B, receivedDate: "2019-03-02", opinionDeadline: "2019-03-20", paymentDeadline: "2019-04-10" };
    expect(validateNotices(wrap(old))).toEqual([old]);
    // 두 기한 모두 null인 과태료는 null
    expect(validateNotices(wrap({ ...B, opinionDeadline: null, paymentDeadline: null }))).toBeNull();
    // 의견제출 기한이 납부기한보다 늦으면(역전) null
    expect(validateNotices(wrap({ ...B, opinionDeadline: "2026-11-30", paymentDeadline: "2026-11-01" }))).toBeNull();
  });

  it.each<[string, Partial<Notice>]>([
    ["두 기한 모두 null", { opinionDeadline: null, paymentDeadline: null }],
    ["기한 역전(의견 11-30 > 납부 11-01)", { opinionDeadline: "2026-11-30", paymentDeadline: "2026-11-01" }],
    ["의견제출 기한이 받은 날 이전", { opinionDeadline: "2026-10-01" }],
    ["납부기한이 받은 날 + 1년 초과", { paymentDeadline: "2027-10-06" }],
    ["범칙금에 opinionDeadline 있음", { kind: "penalty", opinionDeadline: "2026-10-20" }],
    ["범칙금에 discountedAmount 있음", { kind: "penalty", opinionDeadline: null, discountedAmount: 30000 }],
    ["범칙금이 objected 상태", { kind: "penalty", opinionDeadline: null, status: "objected", decidedAt: "2026-10-10", paidAmount: null, savedAmount: 0 }],
    ["open인데 decidedAt 있음", { status: "open", decidedAt: "2026-10-09" }],
    ["open인데 paidAmount 있음", { paidAmount: 32000 }],
    ["open인데 savedAmount 있음", { savedAmount: 8000 }],
    ["paid_early인데 decidedAt null", { status: "paid_early", paidAmount: 32000, savedAmount: 0, decidedAt: null }],
    ["paid_early인데 paidAmount null", { status: "paid_early", paidAmount: null, savedAmount: 0, decidedAt: "2026-10-09" }],
    ["paid_late인데 savedAmount 1200", { status: "paid_late", paidAmount: 32000, savedAmount: 1200, decidedAt: "2026-10-09" }],
    ["objected인데 paidAmount 40000", { status: "objected", paidAmount: 40000, savedAmount: 0, decidedAt: "2026-10-09" }],
    ["amount 999 (하한 미만)", { amount: 999 }],
    ["amount 10000001 (상한 초과)", { amount: 10000001 }],
    ["amount 40000.5 (정수 아님)", { amount: 40000.5 }],
    ["discountedAmount = amount", { discountedAmount: 40000 }],
    ["discountedAmount 0", { discountedAmount: 0 }],
    ["savedAmount -1", { savedAmount: -1 }],
    ["name 빈 문자열", { name: "" }],
    ["name 공백만", { name: "   " }],
    ["name 앞 공백(trim과 다름)", { name: " 강남" }],
    ["name 21자(🚗×21)", { name: "🚗".repeat(21) }],
    ["id 빈 문자열", { id: "" }],
  ])("AC-1[P0]: 불변식·형식 위반 1건(%s)이면 전체가 null이다", (_label, patch) => {
    // 변형 항목 하나가 섞이면 목록 전체가 손상이다
    expect(validateNotices(wrap({ ...B, ...patch }))).toBeNull();
    // 같은 래퍼에 기준 항목만 넣으면 통과한다(모든 변형이 null인 이유가 '항상 null'이 아님을 확인)
    expect(validateNotices(wrap(B))).toEqual([B]);
  });

  it("AC-2[P0]: 유효 항목 50개는 50건을 돌려주고 51개·id 중복·notices 비객체·최상위 배열·amount 누락은 null이다", () => {
    // 서로 다른 id 50개는 그대로 50건
    const fifty = Array.from({ length: 50 }, (_, i) => ({ ...B, id: `n${i}` }));
    const result = validateNotices(wrap(...fifty));
    expect(result).toHaveLength(50);
    expect(result?.[0].id).toBe("n0");
    // 51개는 개수 상한(50) 초과라 null
    const fiftyOne = Array.from({ length: 51 }, (_, i) => ({ ...B, id: `n${i}` }));
    expect(validateNotices(wrap(...fiftyOne))).toBeNull();
    // id 'a1'이 두 번 나오면 null
    expect(validateNotices(wrap(B, { ...B }))).toBeNull();
    // notices가 배열이 아니면 null
    expect(validateNotices({ version: 1, notices: {} })).toBeNull();
    // 최상위가 배열이면 null
    expect(validateNotices([B])).toBeNull();
    // amount가 누락된 항목이 있으면 null
    const noAmount: Partial<Notice> = { ...B };
    delete noAmount.amount;
    expect(validateNotices(wrap(noAmount))).toBeNull();
  });

  it("AC-2[P0]: 형식 위반(날짜·타임스탬프·상태 기록값)은 null이고, undefined·숫자·문자열 입력에도 throw하지 않는다", () => {
    // 달력에 없는 날짜, 날짜 형식 아님, 타임스탬프 형식 아님, objected인데 decidedAt이 없는 날짜 등
    const badFormats: Partial<Notice>[] = [
      { receivedDate: "2026-02-30" },
      { receivedDate: "abc" },
      { opinionDeadline: "2026-13-01" },
      { paymentDeadline: "2026/11/30" },
      { status: "objected", decidedAt: "2026-02-29", paidAmount: null, savedAmount: 0 },
      { createdAt: "yesterday" },
      { updatedAt: "2026-10-09" },
    ];
    for (const patch of badFormats) {
      expect(validateNotices(wrap({ ...B, ...patch }))).toBeNull();
    }
    // 잘못된 최상위 입력은 throw 없이 null
    expect(validateNotices(undefined)).toBeNull();
    expect(validateNotices(42)).toBeNull();
    expect(validateNotices("notices")).toBeNull();
  });

  it("AC-3[P0]: version이 0·'1'·1.5이거나 없으면 손상(corrupt)이다", () => {
    // 1 미만, 정수가 아닌 값, 문자열 '1', 필드 없음은 모두 손상
    expect(classifyStoredData({ version: 0, notices: [B] }).kind).toBe("corrupt");
    expect(classifyStoredData({ version: "1", notices: [B] }).kind).toBe("corrupt");
    expect(classifyStoredData({ version: 1.5, notices: [B] }).kind).toBe("corrupt");
    expect(classifyStoredData({ notices: [B] }).kind).toBe("corrupt");
  });

  it("AC-3[P0]: version 1은 current(검증 후 notices 반환), 2는 newer(손상 아님)다", () => {
    // 현재 버전 1은 검증을 거쳐 항목을 돌려준다
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    const current = classifyStoredData({ version: 1, notices: [B] });
    expect(current.kind).toBe("ok");
    expect(current).toMatchObject({ kind: "ok", notices: [B] });
    // 2는 이 앱보다 새 데이터라 newer다. 손상으로 세지 않는다
    expect(classifyStoredData({ version: 2, notices: [{ id: "x" }] }).kind).toBe("newer");
  });

  it("AC-4[P0]: migrateNoticesData는 단계 함수를 적용해 새 버전을 돌려주고, 단계가 없거나 예외가 나면 null이다", () => {
    const migrations: NoticeMigrations = {
      1: (d) => {
        const data = d as { notices: Notice[] };
        return { version: 2, notices: data.notices.map((n) => ({ ...n, memo: "" })) };
      },
    };
    // v1 → v2 단계를 적용하면 memo가 붙은 항목을 돌려준다
    expect(migrateNoticesData({ version: 1, notices: [B] }, 1, migrations, 2)).toEqual({
      version: 2,
      notices: [{ ...B, memo: "" }],
    });
    // 변환 단계가 빈 객체면 null
    expect(migrateNoticesData({ version: 1, notices: [B] }, 1, {}, 2)).toBeNull();
    // 단계 함수가 예외를 던지면 throw하지 않고 null
    const throwing: NoticeMigrations = {
      1: () => {
        throw new Error("boom");
      },
    };
    expect(migrateNoticesData({ version: 1, notices: [B] }, 1, throwing, 2)).toBeNull();
    // from과 to가 같으면 data를 그대로 돌려준다(기본 인자 포함)
    const data = { version: 1, notices: [B] };
    expect(migrateNoticesData(data, 1, {}, 1)).toBe(data);
    expect(migrateNoticesData(data, 1)).toBe(data);
  });

  it("AC-5[P0]: parseCorruptBackup은 키 없음·정상 목록·맨 문자열·newer를 SPEC 규칙대로 해석한다", () => {
    // 키가 없으면 빈 목록
    expect(parseCorruptBackup(null)).toEqual({ kind: "ok", backups: [] });
    // 형식이 맞는 v1 값이면 그 목록을 돌려준다
    expect(parseCorruptBackup('{"version":1,"backups":[{"raw":"{older"},{"raw":"{bad"}]}')).toEqual({
      kind: "ok",
      backups: [{ raw: "{older" }, { raw: "{bad" }],
    });
    // 백업 스키마가 아닌 맨 문자열은 버리지 않고 항목 1개로 넣는다
    expect(parseCorruptBackup("abc")).toEqual({ kind: "ok", backups: [{ raw: "abc" }] });
    // version 2 이상의 객체는 newer(쓰지 않음)
    expect(parseCorruptBackup('{"version":2,"backups":[]}')).toEqual({ kind: "newer" });
    // 항목이 4개 이상인 v1 값도 형식 밖이라 문자열 전체를 항목 1개로 본다
    const four = '{"version":1,"backups":[{"raw":"{a"},{"raw":"{b"},{"raw":"{c"},{"raw":"{d"}]}';
    expect(parseCorruptBackup(four)).toEqual({ kind: "ok", backups: [{ raw: four }] });
  });
});
