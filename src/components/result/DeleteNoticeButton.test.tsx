import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { mockAll, mockNavigate, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { loadNotices } from "@/lib/noticeStore";
import { DeleteNoticeButton } from "@/components/result/DeleteNoticeButton";
import type { Notice } from "@/lib/types";

mockAll();

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

beforeEach(() => {
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  localStorage.setItem("fdc:notices:v1", JSON.stringify({ version: 1, notices: [notice] }));
  renderWithRouter(<DeleteNoticeButton notice={notice} />);
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
});

describe("DeleteNoticeButton", () => {
  it("왼쪽 버튼은 '닫기', 오른쪽은 '삭제'이고 '취소'는 없다", () => {
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("'강남 주정차' 고지서를 삭제할까요?");
    expect(within(dialog).getAllByRole("button").map((b) => b.textContent)).toEqual(["닫기", "삭제"]);
  });

  it("'닫기'는 삭제하지 않고 이동도 하지 않는다", () => {
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(loadNotices().notices).toHaveLength(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("확인하면 지우고 홈으로 replace 이동한다", () => {
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "삭제" }));
    expect(loadNotices().notices).toEqual([]);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true, state: { deletedName: "강남 주정차" } });
  });
});
