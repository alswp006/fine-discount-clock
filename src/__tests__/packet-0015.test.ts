/**
 * packet 0015 — 고지서 삭제 버튼과 확인 다이얼로그(DeleteNoticeButton)
 *
 * 저장소는 실제 localStorage(noticeStore)를 쓴다 — deleteNotice 호출 여부는 저장소에서 사라졌는지로 검증한다.
 * 쓰기 실패는 Storage.prototype.setItem 스파이로 낸다. Toast·navigate는 공용 목(mocks.ts)을 쓴다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { mockAll, mockNavigate, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { loadNotices } from "@/lib/noticeStore";
import { DeleteNoticeButton } from "@/components/result/DeleteNoticeButton";
import type { Notice } from "@/lib/types";

mockAll();

const h = React.createElement;
const T0 = "2026-10-01T00:00:00.000Z";
const notice: Notice = {
  id: "n1",
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
  createdAt: T0,
  updatedAt: T0,
};

const openDialog = () => {
  localStorage.setItem("fdc:notices:v1", JSON.stringify({ version: 1, notices: [notice] }));
  renderWithRouter(h(DeleteNoticeButton, { notice }));
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
};
const dialog = () => screen.getByRole("alertdialog");

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("[부가] 고지서 삭제 버튼과 확인 다이얼로그", () => {
  it("AC-1[P0]: 누르기 전에는 다이얼로그가 없고, '삭제'를 탭하면 제목 '강남 주정차' 고지서를 삭제할까요?가 뜬다", () => {
    localStorage.setItem("fdc:notices:v1", JSON.stringify({ version: 1, notices: [notice] }));
    renderWithRouter(h(DeleteNoticeButton, { notice }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(dialog()).toHaveTextContent("'강남 주정차' 고지서를 삭제할까요?");
    expect(within(dialog()).getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("AC-1[P0]: 다이얼로그의 버튼은 '취소'와 '삭제' 순서(왼쪽이 취소)다", () => {
    openDialog();
    const names = within(dialog())
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(names).toEqual(["취소", "삭제"]);
  });

  it("AC-2[P0]: '취소'를 누르면 dialog가 닫히고 삭제는 일어나지 않으며 이동도 없다", () => {
    openDialog();
    fireEvent.click(within(dialog()).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(loadNotices().notices.map((n) => n.id)).toEqual(["n1"]);
    expect(mockNavigate).toHaveBeenCalledTimes(0);
    expect(mockOpenToast).toHaveBeenCalledTimes(0);
  });

  it("AC-3[P0]: 다이얼로그의 '삭제'를 확인하면 저장소에서 지워지고 navigate('/', {replace, state:{deletedName}})가 1회 호출된다", () => {
    openDialog();
    fireEvent.click(within(dialog()).getByRole("button", { name: "삭제" }));
    expect(loadNotices().notices).toEqual([]);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true, state: { deletedName: "강남 주정차" } });
    expect(mockOpenToast).toHaveBeenCalledTimes(0);
  });

  it("AC-4[P0]: 저장 공간이 부족(quota)하면 이동 없이 quota 오류 Toast가 1회 뜨고 고지서는 남는다", () => {
    openDialog();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    fireEvent.click(within(dialog()).getByRole("button", { name: "삭제" }));
    expect(mockNavigate).toHaveBeenCalledTimes(0);
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast).toHaveBeenCalledWith("저장 공간이 부족해 삭제하지 못했어요");
    expect(loadNotices().notices.map((n) => n.id)).toEqual(["n1"]);
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });

  it("AC-4[P0]: 저장소에 접근할 수 없으면(unavailable) 이동 없이 unavailable 오류 Toast가 1회 뜬다", () => {
    openDialog();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    fireEvent.click(within(dialog()).getByRole("button", { name: "삭제" }));
    expect(mockNavigate).toHaveBeenCalledTimes(0);
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast).toHaveBeenCalledWith("삭제하지 못했어요. 토스 앱을 다시 실행한 뒤 시도해 주세요");
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });
});
