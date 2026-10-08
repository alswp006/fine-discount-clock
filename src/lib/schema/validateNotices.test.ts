import { describe, it, expect } from "vitest";
import { validateNotices } from "@/lib/schema/validateNotices";
import { classifyVersion } from "@/lib/schema/versioning";
import { parseCorruptBackup } from "@/lib/schema/corruptBackup";
import type { Notice } from "@/lib/types";

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

describe("schema 모듈", () => {
  it("validateNotices: 기준 항목은 통과하고 불변식 위반은 null이다", () => {
    expect(validateNotices({ version: 1, notices: [B] })).toEqual([B]);
    expect(validateNotices({ version: 1, notices: [{ ...B, opinionDeadline: null, paymentDeadline: null }] })).toBeNull();
    expect(validateNotices({ version: 1, notices: [B, B] })).toBeNull();
  });

  it("validateNotices: 이상한 입력에도 throw하지 않는다", () => {
    for (const v of [undefined, null, 1, "x", [], { notices: [null] }]) {
      expect(validateNotices(v)).toBeNull();
    }
  });

  it("classifyVersion: 판정 4종", () => {
    expect(classifyVersion(0)).toBe("corrupt");
    expect(classifyVersion("1")).toBe("corrupt");
    expect(classifyVersion(1)).toBe("current");
    expect(classifyVersion(2)).toBe("newer");
    expect(classifyVersion(1, 2)).toBe("migrate");
  });

  it("parseCorruptBackup: 키 없음·맨 문자열", () => {
    expect(parseCorruptBackup(null)).toEqual({ kind: "ok", backups: [] });
    expect(parseCorruptBackup("abc")).toEqual({ kind: "ok", backups: [{ raw: "abc" }] });
  });
});
