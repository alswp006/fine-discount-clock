import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// 이 패킷은 localStorage 읽기·쓰기 순수 로직만 다룬다(UI 없음). TDS·react-router·AppState 목은 필요 없다.
// 저장소는 jsdom의 실제 localStorage를 쓰고, 쓰기·읽기 예외는 Storage.prototype 스파이로 낸다.
// "오늘"·타임스탬프는 Date를 고정한다(createdAt/updatedAt 검증).
import { loadNotices, saveNotice, updateStatus, deleteNotice } from "@/lib/noticeStore";
import type { Notice, NoticeInput } from "@/lib/types";

const KEY = "fdc:notices:v1";
const BACKUP_KEY = "fdc:notices:corrupt";
const TODAY = "2026-10-09";
const T0 = "2026-10-09T00:00:00.000Z"; // 2026-10-09T09:00:00+09:00

// 신규 저장 입력 (과태료, 두 기한 모두 있음)
const INPUT: NoticeInput = {
  name: "강남 주정차",
  kind: "fine",
  amount: 40000,
  discountedAmount: null,
  receivedDate: "2026-10-05",
  opinionDeadline: "2026-10-20",
  paymentDeadline: "2026-11-30",
};

// 검증을 통과하는 저장 항목 (id만 바꿔 여러 건을 만든다)
const seed = (i: number, extra: Partial<Notice> = {}): Notice => ({
  id: `n${i}`,
  name: `고지서${i}`,
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
  createdAt: T0,
  updatedAt: T0,
  ...extra,
});

const writeNotices = (notices: Notice[]) =>
  localStorage.setItem(KEY, JSON.stringify({ version: 1, notices }));
const readNotices = (): Notice[] => JSON.parse(localStorage.getItem(KEY) ?? "null").notices;
const quotaError = () => new DOMException("full", "QuotaExceededError");
const securityError = () => new DOMException("denied", "SecurityError");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
});

afterEach(() => {
  // clearAllMocks는 구현을 남긴다 — 스파이 예외가 다음 테스트로 새지 않게 원복한다
  vi.restoreAllMocks();
});

describe("localStorage 저장소 — loadNotices·saveNotice·updateStatus·deleteNotice", () => {
  it("AC-1[P0]: 키가 없으면 플래그가 모두 false이고, '{bad'은 손상 백업을 쌓는다(기존 백업 뒤에 추가)", () => {
    // 키가 없으면 빈 목록이고 플래그 5개는 모두 false
    expect(loadNotices()).toEqual({
      notices: [],
      corrupted: false,
      backupFailed: false,
      unavailable: false,
      newerVersion: false,
    });
    // '{bad'는 손상이고, 백업 키에 원문이 한 건 쌓인다
    localStorage.setItem(KEY, "{bad");
    const result = loadNotices();
    expect(result).toEqual({ notices: [], corrupted: true, backupFailed: false, unavailable: false, newerVersion: false });
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{"version":1,"backups":[{"raw":"{bad"}]}');
    // 기존 백업 '{older'가 있으면 그 뒤에 추가된다
    localStorage.setItem(BACKUP_KEY, '{"version":1,"backups":[{"raw":"{older"}]}');
    loadNotices();
    expect(JSON.parse(localStorage.getItem(BACKUP_KEY)!)).toEqual({
      version: 1,
      backups: [{ raw: "{older" }, { raw: "{bad" }],
    });
  });

  it("AC-1[P0]: 백업이 3개 가득이면 backupFailed:true이고 백업을 쓰지 않으며, version 2는 newerVersion이고 백업 쓰기는 0회다", () => {
    // 백업 3개가 찬 상태에서 '{bad'을 읽으면 쓰지 않고 backupFailed:true
    const full = '{"version":1,"backups":[{"raw":"{a"},{"raw":"{b"},{"raw":"{c"}]}';
    localStorage.setItem(BACKUP_KEY, full);
    localStorage.setItem(KEY, "{bad");
    const failed = loadNotices();
    expect(failed.corrupted).toBe(true);
    expect(failed.backupFailed).toBe(true);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(full);

    // version 2 데이터는 손상이 아니라 새 버전: newerVersion이고 백업 키에는 쓰지 않는다
    localStorage.removeItem(BACKUP_KEY);
    localStorage.setItem(KEY, '{"version":2,"notices":[]}');
    const setSpy = vi.spyOn(Storage.prototype, "setItem");
    const newer = loadNotices();
    expect(newer).toEqual({ notices: [], corrupted: false, backupFailed: false, unavailable: false, newerVersion: true });
    expect(setSpy.mock.calls.filter(([k]) => k === BACKUP_KEY)).toHaveLength(0);

    // 저장소 읽기 자체가 SecurityError면 unavailable:true이고 백업 쓰기를 시도하지 않는다
    setSpy.mockClear();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw securityError();
    });
    const denied = loadNotices();
    expect(denied.unavailable).toBe(true);
    expect(denied.corrupted).toBe(false);
    expect(setSpy.mock.calls.filter(([k]) => k === BACKUP_KEY)).toHaveLength(0);
  });

  it("AC-2[P0]: 백업 안 된 '{bad'은 saveNotice가 unbacked로 막고, discardCorrupt면 1건으로 덮어쓰며, newer면 두 방식 모두 newer_version이다", () => {
    // 백업이 없는 '{bad' 상태: 기본 호출은 unbacked이고 원문은 그대로
    localStorage.setItem(KEY, "{bad");
    expect(saveNotice(INPUT)).toEqual({ ok: false, error: "unbacked" });
    expect(localStorage.getItem(KEY)).toBe("{bad");

    // discardCorrupt:true면 저장되고, 저장값은 새 1건이다
    const saved = saveNotice(INPUT, undefined, { discardCorrupt: true });
    expect(saved.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY)!).notices).toHaveLength(1);
    expect(readNotices()[0].name).toBe("강남 주정차");

    // newer 상태는 두 방식 모두 newer_version이고 원문을 건드리지 않는다
    const newerRaw = '{"version":2,"notices":[]}';
    localStorage.setItem(KEY, newerRaw);
    expect(saveNotice(INPUT)).toEqual({ ok: false, error: "newer_version" });
    expect(saveNotice(INPUT, undefined, { discardCorrupt: true })).toEqual({ ok: false, error: "newer_version" });
    expect(localStorage.getItem(KEY)).toBe(newerRaw);
  });

  it("AC-3[P0]: 50건이면 limit, 두 기한이 null이면 invalid를 반환하고 원문이 바뀌지 않는다", () => {
    // 50건 상태에서 새 저장은 limit
    const fifty = Array.from({ length: 50 }, (_, i) => seed(i));
    writeNotices(fifty);
    const before50 = localStorage.getItem(KEY);
    expect(saveNotice(INPUT)).toEqual({ ok: false, error: "limit" });
    expect(localStorage.getItem(KEY)).toBe(before50);

    // 두 기한이 모두 null인 과태료는 invalid이고, 빈 저장소에는 아무것도 쓰지 않는다
    localStorage.clear();
    const invalid = saveNotice({ ...INPUT, opinionDeadline: null, paymentDeadline: null });
    expect(invalid).toEqual({ ok: false, error: "invalid" });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("AC-3[P0]: setItem이 QuotaExceededError를 던지면 saveNotice는 quota를 반환하고 기존 데이터는 그대로다", () => {
    // 기존 1건을 먼저 넣은 뒤에 쓰기만 실패시킨다
    writeNotices([seed(1)]);
    const before = localStorage.getItem(KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });

    const result = saveNotice({ ...INPUT, name: "추가 고지서" });
    expect(result).toEqual({ ok: false, error: "quota" });
    expect(localStorage.getItem(KEY)).toBe(before);
    expect(readNotices()).toEqual([seed(1)]);
  });

  it("AC-4[P0]: 신규는 createdAt=updatedAt, 수정은 createdAt 유지·updatedAt만 갱신, updateStatus는 대상 1건의 updatedAt만 바꾸고 실패한 쓰기는 값을 바꾸지 않는다", () => {
    // 신규 저장: 두 타임스탬프가 같은 시각
    const created = saveNotice(INPUT);
    if (!created.ok) throw new Error("신규 저장 실패");
    expect(created.notice.createdAt).toBe(T0);
    expect(created.notice.updatedAt).toBe(T0);

    // 시각을 1시간 뒤로 옮겨 수정: createdAt은 그대로, updatedAt만 새 시각
    vi.setSystemTime(new Date("2026-10-09T10:00:00+09:00"));
    const edited = saveNotice({ ...INPUT, name: "강남 주정차(수정)" }, created.notice.id);
    if (!edited.ok) throw new Error("수정 실패");
    expect(edited.notice.createdAt).toBe(T0);
    expect(edited.notice.updatedAt).toBe("2026-10-09T01:00:00.000Z");

    // 다른 고지서 하나를 더 두고 updateStatus: 대상의 updatedAt만 바뀐다
    writeNotices([...readNotices(), seed(9)]);
    vi.setSystemTime(new Date("2026-10-09T11:00:00+09:00"));
    const updated = updateStatus(created.notice.id, "paid_early", TODAY);
    if (!updated.ok) throw new Error("상태 기록 실패");
    expect(updated.notice.updatedAt).toBe("2026-10-09T02:00:00.000Z");
    expect(updated.notice.createdAt).toBe(T0);
    expect(readNotices().find((n) => n.id === "n9")).toEqual(seed(9));

    // 실패한 쓰기(quota)에서는 아무 값도 바뀌지 않는다
    const beforeFail = localStorage.getItem(KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });
    expect(updateStatus(created.notice.id, "objected", TODAY)).toEqual({ ok: false, error: "quota" });
    expect(localStorage.getItem(KEY)).toBe(beforeFail);
  });

  it("AC-5[P1]: 없는 id는 not_found, quota는 quota, SecurityError는 unavailable을 반환하고 console.error는 0회다", () => {
    writeNotices([seed(1)]);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // 없는 id
    expect(updateStatus("nope", "paid_early", TODAY)).toEqual({ ok: false, error: "not_found" });
    expect(deleteNotice("nope")).toEqual({ ok: false, error: "not_found" });

    // Quota 예외
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });
    expect(updateStatus("n1", "paid_early", TODAY)).toEqual({ ok: false, error: "quota" });
    expect(deleteNotice("n1")).toEqual({ ok: false, error: "quota" });

    // SecurityError (quota가 아닌 예외)
    setSpy.mockImplementation(() => {
      throw securityError();
    });
    expect(updateStatus("n1", "paid_early", TODAY)).toEqual({ ok: false, error: "unavailable" });
    expect(deleteNotice("n1")).toEqual({ ok: false, error: "unavailable" });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-5[P1]: 'open'으로 되돌리면 paidAmount null·savedAmount 0·decidedAt null이고, 대상 1건만 바뀌며 백업 키에는 쓰지 않는다", () => {
    // paid_early 상태의 n1과 그대로 둘 n2
    writeNotices([
      seed(1, { status: "paid_early", paidAmount: 32000, savedAmount: 8000, decidedAt: "2026-10-08" }),
      seed(2),
    ]);
    const setSpy = vi.spyOn(Storage.prototype, "setItem");

    const reopened = updateStatus("n1", "open", TODAY);
    if (!reopened.ok) throw new Error("open 복귀 실패");
    expect(reopened.notice.status).toBe("open");
    expect(reopened.notice.paidAmount).toBeNull();
    expect(reopened.notice.savedAmount).toBe(0);
    expect(reopened.notice.decidedAt).toBeNull();

    // 대상 외 고지서는 그대로이고, 백업 키에는 아무것도 쓰지 않았다
    expect(readNotices().find((n) => n.id === "n2")).toEqual(seed(2));
    expect(setSpy.mock.calls.filter(([k]) => k === BACKUP_KEY)).toHaveLength(0);
  });
});
