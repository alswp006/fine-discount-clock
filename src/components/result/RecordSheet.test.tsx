import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { mockAll, mockOpenToast, mockRequestReviewOnce } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { TodayProvider } from "@/lib/TodayContext";
import { loadNotices } from "@/lib/noticeStore";
import { buildRecordOptions } from "@/components/result/useRecordActions";
import { RecordSheet } from "@/components/result/RecordSheet";
import type { Notice } from "@/lib/types";

mockAll();

const T0 = "2026-10-01T00:00:00.000Z";
const fine: Notice = {
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
const penalty: Notice = { ...fine, id: "n2", kind: "penalty", opinionDeadline: null, paymentDeadline: "2026-10-20" };

const render = (notice: Notice, today: string) => {
  localStorage.setItem("fdc:notices:v1", JSON.stringify({ version: 1, notices: [notice] }));
  renderWithRouter(
    <TodayProvider value={today}>
      <RecordSheet notice={notice} />
    </TodayProvider>,
  );
};

beforeEach(() => {
  mockOpenToast.mockClear();
  mockRequestReviewOnce.mockClear();
});

describe("RecordSheet", () => {
  it("버튼을 누르기 전에는 옵션이 보이지 않고, 누르면 제목과 옵션 3개가 뜬다", () => {
    render(fine, "2026-10-09");
    expect(screen.queryByText("의견제출을 했어요")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "납부·결정 기록" }));
    expect(screen.getByText("감경가 32,000원으로 납부했어요")).toBeInTheDocument();
    expect(screen.getByText("의견제출을 했어요")).toBeInTheDocument();
    expect(screen.getByText("아직 결정 안 했어요")).toBeInTheDocument();
  });

  it("범칙금에는 의견제출 옵션이 없다", () => {
    expect(buildRecordOptions(penalty, "2026-10-09").map((o) => o.status)).toEqual(["paid_early", "open"]);
  });

  it("범칙금 2차 기한 구간 첫 옵션은 2차 금액이고 절감액이 없다", () => {
    const [first] = buildRecordOptions(penalty, "2026-10-25");
    expect(first.label).toMatch(/^2차 기한 안에 .*원 납부했어요$/);
    expect(first.status).toBe("paid_early");
  });

  it("옵션을 고르면 시트가 닫히고 기록이 저장된다", () => {
    render(fine, "2026-10-09");
    fireEvent.click(screen.getByRole("button", { name: "납부·결정 기록" }));
    fireEvent.click(screen.getByText("감경가 32,000원으로 납부했어요"));
    expect(screen.queryByText("의견제출을 했어요")).toBeNull();
    expect(loadNotices().notices[0].status).toBe("paid_early");
  });
});
