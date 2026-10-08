/**
 * packet 0009 — 홈 페이지(S1): 정리 섹션·빈/차단 상태·Toast·배너
 *
 * loadNotices는 목으로 결과를 주입한다('다시 시도' = loadNotices 재호출로 검증).
 * AdSlot은 data-testid="ad-slot" 스텁으로 바꿔 위치·개수를 본다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { StrictMode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { mockAll, mockLocation, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { TodayProvider } from "@/lib/TodayContext";
import type { LoadResult, Notice } from "@/lib/types";

mockAll();

const loadMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/noticeStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/noticeStore")>()),
  loadNotices: loadMock,
}));
vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => React.createElement("div", { "data-testid": "ad-slot" }),
  default: () => React.createElement("div", { "data-testid": "ad-slot" }),
}));

import Home from "@/pages/Home";

const h = React.createElement;
const T0 = "2026-10-01T00:00:00.000Z";
const base: Notice = {
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
const open2: Notice = { ...base, id: "n2", name: "마트 앞 주정차", opinionDeadline: "2026-10-25" };
const paidEarly: Notice = {
  ...base,
  id: "n3",
  name: "역삼 속도위반",
  status: "paid_early",
  paidAmount: 32000,
  savedAmount: 8000,
  decidedAt: "2026-10-08T00:00:00.000Z",
};

const result = (over: Partial<LoadResult> = {}): LoadResult => ({
  notices: [],
  corrupted: false,
  backupFailed: false,
  unavailable: false,
  newerVersion: false,
  ...over,
});

const renderHome = (strict = false) => {
  const tree = h(TodayProvider, { value: "2026-10-09" }, h(Home));
  return renderWithRouter(strict ? h(StrictMode, null, tree) : tree);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  loadMock.mockReset();
  mockOpenToast.mockClear();
  mockLocation.state = null;
});

describe("홈 페이지(S1) — 정리 섹션·빈/차단 상태·Toast·배너", () => {
  it("AC-1[P0]: 0건이면 빈 상태 문구가 보이고 savings-hero·AdSlot은 0개다", () => {
    loadMock.mockReturnValue(result());
    renderHome();
    expect(screen.getByText("받은 고지서를 등록해 보세요")).toBeInTheDocument();
    expect(screen.getByText("감경 마감일과 늦으면 붙는 금액을 알려줘요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("savings-hero")).toHaveLength(0);
    expect(screen.queryAllByTestId("ad-slot")).toHaveLength(0);
    expect(screen.getByText("과태료 감경시계")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "고지서 등록" })).toBeInTheDocument();
  });

  it("AC-1[P0]: 1건 이상이면 AdSlot이 마지막 notice-card 뒤에 1개만 있다", () => {
    loadMock.mockReturnValue(result({ notices: [base, open2, paidEarly] }));
    renderHome();
    const cards = screen.getAllByTestId("notice-card");
    const ads = screen.getAllByTestId("ad-slot");
    expect(cards).toHaveLength(2);
    expect(ads).toHaveLength(1);
    expect(cards[1].compareDocumentPosition(ads[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("savings-hero")).toHaveLength(1);
  });

  it("AC-2[P0]: paid_early 1건만 있으면 상단 카드 0개, 정리 내역과 saved-total이 보인다", () => {
    loadMock.mockReturnValue(result({ notices: [paidEarly] }));
    renderHome();
    expect(screen.queryAllByTestId("notice-card")).toHaveLength(0);
    expect(screen.getByText("남은 고지서가 없어요")).toBeInTheDocument();
    expect(screen.getByText("정리한 고지서")).toBeInTheDocument();
    expect(screen.getByText("역삼 속도위반")).toBeInTheDocument();
    expect(screen.getByText("감경 납부 · 32,000원")).toBeInTheDocument();
    expect(screen.getByTestId("saved-total")).toHaveTextContent("지금까지 아낀 금액 8,000원");
  });

  it("AC-3[P0]: corrupted면 Toast가 StrictMode에서도 1회만 뜨고 빈 상태가 보인다", () => {
    loadMock.mockReturnValue(result({ corrupted: true }));
    renderHome(true);
    const calls = mockOpenToast.mock.calls.filter((c) => c[0] === "저장된 데이터를 읽을 수 없어 새로 시작해요");
    expect(calls).toHaveLength(1);
    expect(screen.getByText("받은 고지서를 등록해 보세요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("unbacked-warning")).toHaveLength(0);
  });

  it("AC-3[P0]: backupFailed면 unbacked-warning이 추가로 보인다", () => {
    loadMock.mockReturnValue(result({ corrupted: true, backupFailed: true }));
    renderHome();
    expect(screen.getByTestId("unbacked-warning")).toHaveTextContent(
      "이전 데이터를 백업하지 못했어요. 새 고지서를 등록하면 이전 데이터는 지워져요",
    );
    expect(screen.getByText("받은 고지서를 등록해 보세요")).toBeInTheDocument();
  });

  it.each([
    ["unavailable", { unavailable: true }, "저장 공간에 접근할 수 없어요"],
    ["newerVersion", { newerVersion: true }, "새 버전 앱에서 저장한 데이터가 있어요"],
  ] as const)("AC-4[P0]: %s면 StatusState와 '다시 시도'만 보이고 누르면 reload가 1회 호출된다", (_n, over, title) => {
    loadMock.mockReturnValue(result({ ...over }));
    renderHome();
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryAllByTestId("savings-hero")).toHaveLength(0);
    expect(screen.queryAllByTestId("notice-card")).toHaveLength(0);
    expect(screen.queryAllByTestId("ad-slot")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "고지서 등록" })).toBeNull();
    expect(mockOpenToast).not.toHaveBeenCalled();
    const before = loadMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(loadMock.mock.calls.length - before).toBe(1);
  });

  it("AC-5[P1]: location.state.deletedName이면 삭제 Toast가 StrictMode에서도 1회 뜬다", () => {
    loadMock.mockReturnValue(result({ notices: [open2] }));
    mockLocation.state = { deletedName: "강남 주정차" } as never;
    renderHome(true);
    const calls = mockOpenToast.mock.calls.filter((c) => c[0] === "'강남 주정차' 고지서를 삭제했어요");
    expect(calls).toHaveLength(1);
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
  });
});
