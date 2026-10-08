import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  mockTds,
  mockAppsInToss,
  mockRouter,
  mockAnalytics,
  mockNavigate,
  mockLocation,
  mockLogClick,
  mockLogImpression,
  mockShareApp,
} from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockRouter();
mockAnalytics();

vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children }: any) =>
    React.createElement("div", { "data-testid": "reward-ad" }, children),
  default: ({ children }: any) =>
    React.createElement("div", { "data-testid": "reward-ad" }, children),
}));

vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => React.createElement("div", { "data-testid": "ad-slot" }),
}));

import NoticeResult from "@/pages/NoticeResult";

const T0 = "2026-10-01T00:00:00.000Z";
const notice = {
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

function seed(notices: unknown[], version = 1) {
  localStorage.setItem("fdc:notices:v1", JSON.stringify({ version, notices }));
}

function renderAt(path: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/notice/:id",
          element: React.createElement(NoticeResult),
        }),
      ),
    ),
  );
}

const impressions = (name: string) =>
  mockLogImpression.mock.calls.filter((c) => c[0] === name).length;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  mockNavigate.mockClear();
  mockLogClick.mockClear();
  mockLogImpression.mockClear();
  mockShareApp.mockReset();
  mockShareApp.mockImplementation(async () => {});
  mockLocation.state = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("고지서 결과 페이지(S4) NoticeResult 조립", () => {
  it("AC-1[P0]: 정상 고지서면 result_free_tier 노출 로그가 1회, free-tier는 TossRewardAd 바깥", () => {
    seed([notice]);
    renderAt("/notice/n1");

    expect(impressions("result_free_tier")).toBe(1);
    const free = screen.getByTestId("free-tier");
    expect(free.closest('[data-testid="reward-ad"]')).toBeNull();
    expect(screen.getByTestId("locked-tier").closest('[data-testid="reward-ad"]')).not.toBeNull();
  });

  it("AC-1[P0]: justSaved 상태로 진입해도 result_free_tier는 1회", () => {
    seed([notice]);
    mockLocation.state = { justSaved: true } as any;
    renderAt("/notice/n1");

    expect(impressions("result_free_tier")).toBe(1);
    expect(screen.getAllByTestId("free-tier")).toHaveLength(1);
  });

  it("AC-2[P0]: 없는 id면 '고지서를 찾을 수 없어요'만 보이고 '홈으로'는 replace 이동", () => {
    seed([notice]);
    renderAt("/notice/abc");

    expect(screen.getByText("고지서를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("free-tier")).toHaveLength(0);
    expect(screen.queryAllByTestId("locked-tier")).toHaveLength(0);
    expect(screen.queryAllByTestId("reward-ad")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("AC-2[P0]: corrupted 저장 데이터도 같은 화면, 게이트 0개", () => {
    localStorage.setItem("fdc:notices:v1", "{not json");
    renderAt("/notice/n1");

    expect(screen.getByText("고지서를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈으로" })).toBeInTheDocument();
    expect(screen.queryAllByTestId("free-tier")).toHaveLength(0);
    expect(screen.queryAllByTestId("reward-ad")).toHaveLength(0);
    expect(impressions("result_free_tier")).toBe(0);
  });

  it("AC-3[P0]: newerVersion이면 안내가 보이고 impression 로그는 0회", () => {
    seed([notice], 99);
    renderAt("/notice/n1");

    expect(screen.getByText("새 버전 앱에서 저장한 데이터가 있어요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("free-tier")).toHaveLength(0);
    expect(impressions("result_free_tier")).toBe(0);
    expect(impressions("scenario_locked_tier")).toBe(0);
  });

  it("AC-3[P0]: unavailable이면 안내가 보이고 impression 로그는 0회", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    renderAt("/notice/n1");

    expect(screen.getByText("저장 공간에 접근할 수 없어요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("locked-tier")).toHaveLength(0);
    expect(impressions("result_free_tier")).toBe(0);
    expect(impressions("scenario_locked_tier")).toBe(0);
  });

  it("AC-4[P0]: 공유하기 탭 → logClick('result_share') 1회, shareApp 1회, 진행 중 재탭은 무시", async () => {
    seed([notice]);
    let resolve!: () => void;
    mockShareApp.mockImplementation(
      () => new Promise<void>((r) => { resolve = r; }),
    );
    renderAt("/notice/n1");

    const btn = screen.getByRole("button", { name: "공유하기" });
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
    fireEvent.click(screen.getByRole("button", { name: "공유하기" }));

    expect(mockLogClick.mock.calls.filter((c) => c[0] === "result_share")).toHaveLength(1);
    expect(mockShareApp).toHaveBeenCalledTimes(1);

    await act(async () => { resolve(); });
    expect(mockShareApp).toHaveBeenCalledTimes(1);
  });

  it("AC-4[P0]: shareApp이 reject돼도 throw·console.error 0회", async () => {
    seed([notice]);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockShareApp.mockImplementation(async () => { throw new Error("share failed"); });
    renderAt("/notice/n1");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
    });

    expect(mockShareApp).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(0);
    expect(screen.getByRole("button", { name: "공유하기" })).toBeInTheDocument();
  });

  it("AC-5[P1]: AdSlot은 1개, 본문 최하단이며 고정 높이·배경 래퍼가 없다", () => {
    seed([notice]);
    renderAt("/notice/n1");

    const ads = screen.getAllByTestId("ad-slot");
    expect(ads).toHaveLength(1);
    const ad = ads[0];
    const delBtn = screen.getByRole("button", { name: "삭제" });
    expect(
      delBtn.compareDocumentPosition(ad) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    for (let el = ad.parentElement; el && el !== document.body; el = el.parentElement) {
      expect(el.style.height).toBe("");
      expect(el.style.minHeight).toBe("");
      expect(el.style.background).toBe("");
      expect(el.style.backgroundColor).toBe("");
    }
  });
});
