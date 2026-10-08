/**
 * packet 0011 — 신규 등록 페이지(S2) NoticeCreate와 제출 흐름
 *
 * 저장소는 실제 localStorage를 쓴다. saveNotice는 기본으로 원본에 위임하는 spy라서
 * 'invalid'·'unbacked'처럼 실제 저장소로 만들기 어려운 반환만 mockReturnValueOnce로 낸다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { mockAll, mockNavigate, mockOpenToast, mockLogClick } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { storeErrorMessage } from "@/lib/messages";
import type { Notice } from "@/lib/types";

const { saveSpy, original } = vi.hoisted(() => ({
  saveSpy: vi.fn(),
  original: { save: undefined as undefined | ((...args: unknown[]) => unknown) },
}));
vi.mock("@/lib/store/saveNotice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store/saveNotice")>();
  original.save = actual.saveNotice as (...args: unknown[]) => unknown;
  saveSpy.mockImplementation(actual.saveNotice);
  return { ...actual, saveNotice: saveSpy };
});

mockAll();

import NoticeCreate from "@/pages/NoticeCreate";

const h = React.createElement;
const KEY = "fdc:notices:v1";
const T0 = "2026-10-01T00:00:00.000Z";

const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "null") as { version: number; notices: Notice[] } | null;
const render = () => renderWithRouter(h(NoticeCreate));
const field = (label: RegExp | string) => screen.getByLabelText(label) as HTMLInputElement;
const change = (label: RegExp | string, value: string) => fireEvent.change(field(label), { target: { value } });
const tapSave = () => fireEvent.click(screen.getByRole("button", { name: "저장" }));

/** F2-AC-1 값 */
const fillValid = () => {
  change("고지서 이름", "강남 주정차");
  change(/원래 금액/, "40000");
  change("받은 날", "2026-10-05");
  change("의견제출 기한", "2026-10-20");
};

const seedNotices = (n: number) => {
  const notices: Notice[] = Array.from({ length: n }, (_, i) => ({
    id: `seed-${i}`,
    name: `고지서 ${i}`,
    kind: "fine",
    amount: 40000,
    discountedAmount: null,
    receivedDate: "2026-10-05",
    opinionDeadline: "2026-10-20",
    paymentDeadline: null,
    status: "open",
    paidAmount: null,
    savedAmount: 0,
    decidedAt: null,
    createdAt: T0,
    updatedAt: T0,
  }));
  localStorage.setItem(KEY, JSON.stringify({ version: 1, notices }));
};

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  mockLogClick.mockClear();
  // afterEach의 vi.restoreAllMocks()가 spy의 위임을 지우므로 매번 다시 건다
  saveSpy.mockReset();
  saveSpy.mockImplementation(original.save as never);
  vi.mocked(generateHapticFeedback).mockClear();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("신규 등록 페이지(S2) NoticeCreate와 제출 흐름", () => {
  it("AC-1[P0]: 구성 — Top '고지서 등록', 이름·금액·받은 날 필드, '저장' 버튼이 보인다", () => {
    render();
    expect(screen.getByText("고지서 등록")).toBeInTheDocument();
    expect(field("고지서 이름").value).toBe("");
    expect(field(/원래 금액/).value).toBe("");
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });

  it("AC-1[P0]: F2-AC-1 값으로 '저장'하면 1건이 저장되고 logClick·햅틱·Toast·결과 화면 이동이 일어난다", () => {
    render();
    fillValid();
    tapSave();

    const data = stored();
    expect(data?.version).toBe(1);
    expect(data?.notices).toHaveLength(1);
    const saved = data!.notices[0];
    expect(saved).toMatchObject({
      name: "강남 주정차",
      kind: "fine",
      amount: 40000,
      discountedAmount: null,
      receivedDate: "2026-10-05",
      opinionDeadline: "2026-10-20",
      status: "open",
    });

    expect(mockLogClick).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith("notice_save");
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(mockOpenToast).toHaveBeenCalledWith("고지서를 등록했어요");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate.mock.calls[0][0]).toBe(`/notice/${saved.id}`);
    expect(mockNavigate.mock.calls[0][1]).toMatchObject({ state: { justSaved: true } });
  });

  it("AC-1[P0]: 필수값이 비면 저장하지 않고 필드 아래 문구만 띄운다", () => {
    render();
    tapSave();
    expect(screen.getByText("고지서 이름을 입력해주세요")).toBeInTheDocument();
    expect(screen.getByText("금액을 1,000원 이상 입력해주세요")).toBeInTheDocument();
    expect(screen.getByText("고지서 받은 날을 입력해주세요")).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(saveSpy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each([
    ["limit"],
    ["quota"],
    ["invalid"],
    ["unavailable"],
    ["newer_version"],
  ] as const)("AC-2[P0]: saveNotice가 '%s'를 반환하면 SPEC 문구 Toast가 뜨고 입력값이 유지된다", (error) => {
    render();
    fillValid();
    saveSpy.mockReturnValueOnce({ ok: false, error });
    tapSave();

    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast).toHaveBeenCalledWith(storeErrorMessage(error));
    expect(field("고지서 이름").value).toBe("강남 주정차");
    expect(field(/원래 금액/).value).toBe("40,000");
    expect(field("받은 날").value).toBe("2026-10-05");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: 실제 저장소가 50장으로 차 있으면 limit 문구 Toast가 뜬다", () => {
    seedNotices(50);
    render();
    fillValid();
    tapSave();
    expect(mockOpenToast).toHaveBeenCalledWith("고지서는 50장까지 등록할 수 있어요");
    expect(stored()?.notices).toHaveLength(50);
    expect(field("고지서 이름").value).toBe("강남 주정차");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: 쓰기가 quota로 실패하면 저장 공간 문구 Toast가 뜨고 이동하지 않는다", () => {
    render();
    fillValid();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    tapSave();
    expect(mockOpenToast).toHaveBeenCalledWith("저장 공간이 부족해 저장하지 못했어요");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(field("고지서 이름").value).toBe("강남 주정차");
  });

  it("AC-3[P0]: 'unbacked'이면 확인 다이얼로그가 뜨고(왼쪽 '닫기') 확인하면 discardCorrupt:true로 다시 저장한다", () => {
    localStorage.setItem(KEY, "{bad");
    render();
    fillValid();
    saveSpy.mockReturnValueOnce({ ok: false, error: "unbacked" });
    tapSave();

    const dialog = screen.getByRole("alertdialog");
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("닫기");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOpenToast).not.toHaveBeenCalled();

    fireEvent.click(buttons[1]);
    expect(saveSpy).toHaveBeenCalledTimes(2);
    expect(saveSpy.mock.calls[1][1]).toBeUndefined();
    expect(saveSpy.mock.calls[1][2]).toEqual({ discardCorrupt: true });
    expect(stored()?.notices).toHaveLength(1);
    expect(mockOpenToast).toHaveBeenCalledWith("고지서를 등록했어요");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith("notice_save");
  });

  it("AC-3[P0]: '닫기'를 누르면 저장하지 않고 입력값을 유지하며 logClick은 1회뿐이다", () => {
    localStorage.setItem(KEY, "{bad");
    render();
    fillValid();
    saveSpy.mockReturnValueOnce({ ok: false, error: "unbacked" });
    tapSave();
    fireEvent.click(within(screen.getByRole("alertdialog")).getAllByRole("button")[0]);

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).toBe("{bad");
    expect(field("고지서 이름").value).toBe("강남 주정차");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockLogClick).toHaveBeenCalledTimes(1);
  });

  it("AC-3[P0]: 다이얼로그에서 다시 저장했는데 quota면 Toast가 뜨고 logClick은 늘지 않는다", () => {
    render();
    fillValid();
    saveSpy.mockReturnValueOnce({ ok: false, error: "unbacked" }).mockReturnValueOnce({ ok: false, error: "quota" });
    tapSave();
    fireEvent.click(within(screen.getByRole("alertdialog")).getAllByRole("button")[1]);

    expect(mockOpenToast).toHaveBeenCalledWith("저장 공간이 부족해 저장하지 못했어요");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockLogClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["손상(corrupted)", () => localStorage.setItem(KEY, "{bad")],
    ["새 버전(newerVersion)", () => localStorage.setItem(KEY, JSON.stringify({ version: 2, notices: [] }))],
    [
      "저장소 접근 불가(unavailable)",
      () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
          throw new Error("denied");
        });
      },
    ],
  ])("AC-4[P1]: %s 상태에서도 /notice/new는 빈 폼을 렌더한다", (_name, arrange) => {
    arrange();
    render();
    expect(field("고지서 이름").value).toBe("");
    expect(field(/원래 금액/).value).toBe("");
    expect(field("받은 날").value).toBe("");
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-5[P1]: 거부 문구가 뜬 빈 금액 필드로 '저장'하면 문구가 '금액을 숫자로 입력해주세요'로 바뀐다", () => {
    render();
    change(/원래 금액/, "40000.5");
    expect(screen.getByText("소수점 없이 원 단위로 입력해주세요")).toBeInTheDocument();
    expect(field(/원래 금액/).value).toBe("");

    tapSave();
    expect(screen.getByText("금액을 숫자로 입력해주세요")).toBeInTheDocument();
    expect(screen.queryByText("소수점 없이 원 단위로 입력해주세요")).toBeNull();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
