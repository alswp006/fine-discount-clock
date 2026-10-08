import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import * as FreeTierModule from "@/components/result/FreeTier";
import * as LegalNoticeModule from "@/components/result/LegalNotice";
import { potentialSaving } from "@/lib/fineEngine";

mockAll();

const h = React.createElement;
const FreeTier: any = (FreeTierModule as any).default ?? (FreeTierModule as any).FreeTier;
const LegalNotice: any = (LegalNoticeModule as any).default ?? (LegalNoticeModule as any).LegalNotice;

const fine: any = {
  id: "n1",
  name: "강남 주정차",
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
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const penalty: any = {
  ...fine,
  id: "n2",
  name: "출근길 속도위반",
  kind: "penalty",
  opinionDeadline: null,
  paymentDeadline: null,
};

const renderTier = (notice: any, today: string) =>
  render(h(MemoryRouter, null, h(FreeTier, { notice, today })));

const text = (el: HTMLElement) => (el.textContent ?? "").replace(/\s+/g, " ");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  mockNavigate.mockClear();
});

describe("결과 무료 층 FreeTier(D-day 히어로·금액 비교)와 LegalNotice", () => {
  it("AC-1[P0]: 감경 마감 전 과태료는 D-day·금액 두 개가 보이고 ListRow 3개·절약 배지 1개다", () => {
    renderTier(fine, "2026-10-09");
    const tier = screen.getByTestId("free-tier");
    expect(text(tier)).toContain("감경 마감까지 D-11");
    expect(text(tier)).toContain("2026.10.20(화)");
    expect(within(tier).getAllByText(/32,000원/).length).toBeGreaterThan(0);
    expect(within(tier).getAllByText(/40,000원/).length).toBeGreaterThan(0);

    const card = within(tier).getByTestId("compare-card");
    expect(card.querySelectorAll("li")).toHaveLength(3);
    const badges = within(tier).getAllByRole("status");
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toBe("8,000원 절약");
    // 홈 히어로와 같은 단일 출처
    expect(potentialSaving(fine, "2026-10-09")).toBe(8000);
  });

  it("AC-2[P0]: 감경 마감 후 납부기한이 있으면 납부기한 D-day와 비활성 색 감경 행이 보인다", () => {
    renderTier({ ...fine, paymentDeadline: "2026-11-30" }, "2026-10-21");
    const tier = screen.getByTestId("free-tier");
    expect(text(tier)).toContain("납부기한까지 D-40");
    expect(text(tier)).toContain("2026.11.30(월)");
    const ended = within(tier).getByText("감경 기간이 끝났어요");
    expect(ended.closest('[style*="--adaptiveGrey400"]')).not.toBeNull();
    expect(within(tier).queryByText("8,000원 절약")).toBeNull();
  });

  it("AC-2[P0]: 납부기한이 없으면 입력 요청 문구와 Button이 보이고 누르면 수정 화면으로 이동한다", () => {
    renderTier(fine, "2026-10-21");
    const tier = screen.getByTestId("free-tier");
    expect(within(tier).getByText("납부기한을 입력해 주세요")).toBeInTheDocument();
    fireEvent.click(within(tier).getByRole("button", { name: "납부기한 입력" }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/notice/n1/edit", { state: { focus: "paymentDeadline" } });
  });

  it("AC-2[P0]: 감경 기간 안에는 납부기한 입력 Button이 없다", () => {
    renderTier(fine, "2026-10-09");
    expect(screen.queryByRole("button", { name: "납부기한 입력" })).toBeNull();
    expect(screen.queryByText("납부기한을 입력해 주세요")).toBeNull();
  });

  it("AC-3[P0]: 범칙금은 1차·2차·즉결심판 3행과 1차 D-day가 보이고 감경 문구는 없다", () => {
    renderTier(penalty, "2026-10-09");
    const tier = screen.getByTestId("free-tier");
    expect(text(tier)).toContain("1차 납부기한까지 D-6");
    expect(text(tier)).toContain("2026.10.15(목)");
    expect(within(tier).getByText(/1차 기한 안에 40,000원/)).toBeInTheDocument();
    expect(within(tier).getByText(/2차 기한\(2026\.11\.04\)까지 48,000원/)).toBeInTheDocument();
    expect(
      within(tier).getByText(/그 뒤엔 즉결심판이 청구돼요 \(도로교통법 제165조\)/),
    ).toBeInTheDocument();
    expect(within(tier).getByTestId("compare-card").querySelectorAll("li")).toHaveLength(3);
    expect(text(tier)).not.toContain("감경");
  });

  it("AC-4[P0]: 모든 기한이 지나면 지남 문구가 보이고 Badge는 0개다", () => {
    renderTier({ ...fine, paymentDeadline: "2026-11-30" }, "2026-12-01");
    const tier = screen.getByTestId("free-tier");
    expect(text(tier)).toContain("납부기한이 지났어요 · D+1 · 2026.11.30(월)");
    expect(within(tier).queryAllByRole("status")).toHaveLength(0);
  });

  it("AC-4[P0]: objected면 hero 위에 대기 문구가 먼저 나오고, open이면 나오지 않는다", () => {
    const msg = "의견제출 결과를 기다리는 중이에요. 받아들여지지 않으면 감경 없이 부과될 수 있어요";
    const { unmount } = renderTier({ ...fine, status: "objected", paymentDeadline: "2026-11-30" }, "2026-10-09");
    const tier = screen.getByTestId("free-tier");
    const notice = within(tier).getByText(msg);
    const hero = within(tier).getByTestId("dday-hero");
    expect(notice.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    unmount();

    renderTier(fine, "2026-10-09");
    expect(screen.queryByText(msg)).toBeNull();
  });

  it("AC-5[P0]: LegalNotice는 고정 법적 고지와 납부처 텍스트가 있고 링크는 0개다", () => {
    const { container } = render(h(MemoryRouter, null, h(LegalNotice)));
    expect(
      screen.getByText("법령의 일반 기준으로 계산한 참고값이에요. 고지서에 적힌 금액과 기한이 우선이에요."),
    ).toBeInTheDocument();
    expect(screen.getByText("고지서의 가상계좌, 이파인, 위택스에서 낼 수 있어요")).toBeInTheDocument();
    expect(container.querySelectorAll("a[href]")).toHaveLength(0);
  });
});
