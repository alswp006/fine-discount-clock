/**
 * packet 0014 — 납부·결정 기록 BottomSheet(RecordSheet)와 기록 동작 훅(useRecordActions)
 *
 * 저장소는 실제 localStorage(noticeStore)를 쓴다 — savedAmount·status는 엔진이 계산해 저장소에 남은 값으로 검증한다.
 * 쓰기 실패는 Storage.prototype.setItem 스파이로 낸다. "오늘"은 TodayProvider로 주입한다.
 * 계측·리뷰·Toast는 목으로 호출 횟수를 단언한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const h = React.createElement;

const spies = vi.hoisted(() => ({
  toast: vi.fn(),
  review: vi.fn(),
  click: vi.fn(),
}));

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  logClick: spies.click,
}));

vi.mock("@/lib/review", () => ({
  requestReviewOnce: spies.review,
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
  requestReview: vi.fn(),
}));

vi.mock("@toss/tds-mobile", () => {
  const slot = (name: string, node: unknown) =>
    node == null || node === false ? null : h("span", { "data-slot": name }, node as never);
  const btn = ({ children, onClick, display: _d, variant: _v, size: _s, color: _c, loading: _l, ...p }: any) =>
    h("button", { type: "button", onClick, ...p }, children);
  return {
    Button: btn,
    ListRow: Object.assign(
      ({ left, contents, right, onClick, children: _dropped, ...p }: any) =>
        h(
          "li",
          { onClick, role: onClick ? "button" : undefined, ...p },
          slot("left", left),
          h("span", { "data-slot": "contents" }, contents),
          slot("right", right),
        ),
      {
        Texts: ({ top, bottom, type }: any) =>
          h(React.Fragment, null, h("span", { "data-type": type, "data-slot": "top" }, top), h("span", { "data-slot": "bottom" }, bottom)),
        Text: ({ children }: any) => h("span", null, children),
        AssetIcon: ({ name }: any) => h("span", { "data-asset": name }),
      },
    ),
    BottomSheet: Object.assign(
      ({ open, children, header, headerDescription, cta, onClose }: any) =>
        open
          ? h(
              "div",
              { role: "dialog" },
              header != null ? h("header", null, header) : null,
              headerDescription != null ? h("div", null, headerDescription) : null,
              children,
              cta != null ? h("footer", null, cta) : null,
              h("button", { type: "button", "aria-label": "닫기", onClick: onClose }),
            )
          : null,
      {
        Header: ({ children }: any) => h("div", null, children),
        HeaderDescription: ({ children }: any) => h("p", null, children),
        CTA: btn,
        DoubleCTA: ({ leftButton, rightButton }: any) => h("div", null, leftButton, rightButton),
      },
    ),
    Spacing: ({ size }: any) => h("div", { "data-spacing": size }),
    Border: () => h("hr"),
    Badge: ({ children }: any) => h("span", { role: "status" }, children),
    Text: ({ children, typography: _t, color: _c, ...p }: any) => h("div", p, children),
    Paragraph: Object.assign(
      ({ children, typography: _t, color: _c, ...p }: any) => h("div", p, children),
      { Text: ({ children, typography: _t, color: _c, fontWeight: _f, ...p }: any) => h("span", p, children) },
    ),
    useToast: () => ({ openToast: spies.toast }),
    Toast: ({ open, text }: any) => (open ? h("div", { role: "status" }, text) : null),
  };
});

import { TodayProvider } from "@/lib/TodayContext";
import { loadNotices } from "@/lib/noticeStore";
import { RecordSheet } from "@/components/result/RecordSheet";
import type { Notice } from "@/lib/types";

const KEY = "fdc:notices:v1";
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

const seedStore = (n: Notice) => localStorage.setItem(KEY, JSON.stringify({ version: 1, notices: [n] }));
const stored = (id: string): Notice => loadNotices().notices.find((n) => n.id === id)!;

const openSheet = (notice: Notice, today: string) => {
  seedStore(notice);
  render(
    h(
      MemoryRouter,
      null,
      h(TodayProvider, { value: today, children: h(RecordSheet as React.ComponentType<{ notice: Notice }>, { notice }) }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "납부·결정 기록" }));
};

const tap = (label: string | RegExp) => fireEvent.click(screen.getByText(label));

beforeEach(() => {
  spies.toast.mockClear();
  spies.review.mockClear();
  spies.click.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("납부·결정 기록 BottomSheet와 기록 동작 훅", () => {
  it("AC-1[P0]: 10-09에 '감경가 32,000원으로 납부했어요'를 탭하면 paid_early·savedAmount 8000이고 logClick('mark_paid_early')·requestReviewOnce가 각 1회다", () => {
    openSheet(fine, "2026-10-09");
    tap("감경가 32,000원으로 납부했어요");
    const saved = stored("n1");
    expect(saved.status).toBe("paid_early");
    expect(saved.savedAmount).toBe(8000);
    expect(saved.paidAmount).toBe(32000);
    expect(spies.click).toHaveBeenCalledTimes(1);
    expect(spies.click).toHaveBeenCalledWith("mark_paid_early");
    expect(spies.review).toHaveBeenCalledTimes(1);
    expect(spies.toast).toHaveBeenCalledWith("감경 납부를 기록했어요. 8,000원 아꼈어요");
  });

  it("AC-2[P0]: 감경 마감 후·납부기한 전(10-21) 과태료는 첫 옵션이 '기한 안에 40,000원 납부했어요'이고 savedAmount는 1200이다", () => {
    openSheet(fine, "2026-10-21");
    expect(screen.queryByText(/감경가/)).toBeNull();
    expect(screen.getByText("기한 안에 40,000원 납부했어요")).toBeInTheDocument();
    tap("기한 안에 40,000원 납부했어요");
    const saved = stored("n1");
    expect(saved.status).toBe("paid_early");
    expect(saved.savedAmount).toBe(1200);
    expect(saved.paidAmount).toBe(40000);
  });

  it("AC-2[P0]: 범칙금 1차 기한 전이면 첫 옵션이 '1차 기한 안에 40,000원 납부했어요'이고 savedAmount는 8000이다", () => {
    openSheet(penalty, "2026-10-09");
    const first = screen.getByText("1차 기한 안에 40,000원 납부했어요");
    expect(first).toBeInTheDocument();
    fireEvent.click(first);
    const saved = stored("n2");
    expect(saved.status).toBe("paid_early");
    expect(saved.savedAmount).toBe(8000);
  });

  it("AC-3[P0]: 모든 기한이 지난 12-01에 기한 지나 납부를 기록하면 Toast '납부를 기록했어요'·mark_paid_late 1회·리뷰 요청 0회다", () => {
    openSheet(fine, "2026-12-01");
    tap(/기한.*지나/);
    const saved = stored("n1");
    expect(saved.status).toBe("paid_late");
    expect(saved.savedAmount).toBe(0);
    expect(spies.toast).toHaveBeenCalledWith("납부를 기록했어요");
    expect(spies.click).toHaveBeenCalledTimes(1);
    expect(spies.click).toHaveBeenCalledWith("mark_paid_late");
    expect(spies.review).toHaveBeenCalledTimes(0);
  });

  it("AC-4[P0]: '의견제출을 했어요'는 objected로 기록하고, 이어서 '아직 결정 안 했어요'는 open/null/0/null로 되돌린다", () => {
    openSheet(fine, "2026-10-09");
    tap("의견제출을 했어요");
    const objected = stored("n1");
    expect(objected.status).toBe("objected");
    expect(objected.paidAmount).toBeNull();
    expect(spies.review).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByRole("button", { name: "납부·결정 기록" }));
    tap("아직 결정 안 했어요");
    const reopened = stored("n1");
    expect(reopened.status).toBe("open");
    expect(reopened.paidAmount).toBeNull();
    expect(reopened.savedAmount).toBe(0);
    expect(reopened.decidedAt).toBeNull();
  });

  it("AC-5[P0]: 저장 공간이 부족하면 Toast '저장 공간이 부족해 기록하지 못했어요'가 뜨고 status는 그대로이며 리뷰·클릭 로그는 0회다", () => {
    openSheet(fine, "2026-10-09");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    tap("감경가 32,000원으로 납부했어요");
    expect(spies.toast).toHaveBeenCalledTimes(1);
    expect(spies.toast).toHaveBeenCalledWith("저장 공간이 부족해 기록하지 못했어요");
    expect(stored("n1").status).toBe("open");
    expect(spies.review).toHaveBeenCalledTimes(0);
    expect(spies.click).toHaveBeenCalledTimes(0);
  });

  it("AC-5[P0]: 저장소에 접근할 수 없으면(unavailable) 실패 Toast만 뜨고 성공 문구·리뷰·클릭 로그는 없다", () => {
    openSheet(fine, "2026-10-09");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    tap("감경가 32,000원으로 납부했어요");
    expect(spies.toast).toHaveBeenCalledTimes(1);
    expect(spies.toast).not.toHaveBeenCalledWith("납부를 기록했어요");
    expect(spies.toast).not.toHaveBeenCalledWith("저장 공간이 부족해 기록하지 못했어요");
    expect(stored("n1").status).toBe("open");
    expect(spies.review).toHaveBeenCalledTimes(0);
    expect(spies.click).toHaveBeenCalledTimes(0);
  });
});
