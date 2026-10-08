/**
 * packet 0017 — 고지서 수정 페이지(S3) NoticeEdit
 * 저장소는 실제 localStorage. 라우트 /notice/:id/edit 로 진입한다(location.state는 mockLocation).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { Routes, Route } from "react-router-dom";
import { fireEvent, screen } from "@testing-library/react";
import { mockAll, mockLocation, mockNavigate, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { Notice } from "@/lib/types";

mockAll();

import NoticeEdit from "@/pages/NoticeEdit";

const h = React.createElement;
const KEY = "fdc:notices:v1";
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

const seed = (n: Notice) => localStorage.setItem(KEY, JSON.stringify({ version: 1, notices: [n] }));
const stored = () =>
  (JSON.parse(localStorage.getItem(KEY) ?? "null") as { notices: Notice[] }).notices;
const render = (id = "n1") =>
  renderWithRouter(
    h(Routes, null, h(Route, { path: "/notice/:id/edit", element: h(NoticeEdit) })),
    { initialEntries: [`/notice/${id}/edit`] },
  );
const field = (label: RegExp | string) => screen.getByLabelText(label) as HTMLInputElement;
const change = (label: RegExp | string, value: string) => fireEvent.change(field(label), { target: { value } });
const tapSave = () => fireEvent.click(screen.getByRole("button", { name: "저장" }));
const RESET_TITLE = "금액이나 기한을 바꾸면 납부 기록이 초기화돼요";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  mockLocation.state = null;
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("고지서 수정 페이지(S3) NoticeEdit", () => {
  it("AC-1[P0]: 저장값으로 폼이 프리필되고 Top 제목은 '고지서 수정'이다", () => {
    seed(base);
    render();
    expect(screen.getByText("고지서 수정")).toBeInTheDocument();
    expect(field("고지서 이름").value).toBe("강남 주정차");
    expect(field(/원래 금액/).value).toBe("40,000");
    expect(field("받은 날").value).toBe("2026-10-05");
    expect(field("의견제출 기한").value).toBe("2026-10-20");
    expect(field("납부기한").value).toBe("2026-11-30");
  });

  it("AC-1[P0]: amount를 50000으로 저장하면 같은 id의 amount가 바뀌고 Toast가 뜬다", () => {
    seed(base);
    render();
    change(/원래 금액/, "50000");
    tapSave();
    const list = stored();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("n1");
    expect(list[0].amount).toBe(50000);
    expect(list[0].name).toBe("강남 주정차");
    expect(mockOpenToast).toHaveBeenCalledWith("고지서를 수정했어요");
  });

  it("AC-2[P1]: state.focus='paymentDeadline'이면 납부기한 input에 포커스가 간다", () => {
    seed(base);
    mockLocation.state = { focus: "paymentDeadline" } as never;
    render();
    expect(document.activeElement).toBe(field("납부기한"));
    expect(document.activeElement).not.toBe(field("고지서 이름"));
  });

  it("AC-3[P0]: paid_early 고지서에서 이름만 바꾸면 납부 기록이 유지되고 다이얼로그는 없다", () => {
    seed({ ...base, status: "paid_early", paidAmount: 30000, savedAmount: 10000, decidedAt: "2026-10-08" });
    render();
    change("고지서 이름", "역삼 주정차");
    tapSave();
    expect(screen.queryByText(RESET_TITLE)).toBeNull();
    expect(stored()[0]).toMatchObject({
      name: "역삼 주정차",
      status: "paid_early",
      paidAmount: 30000,
      savedAmount: 10000,
      decidedAt: "2026-10-08",
    });
  });

  it("AC-3[P0]: paid_early 고지서에서 금액을 바꾸면 다이얼로그가 뜨고 '바꾸기'로 open 초기화 후 저장, '취소'는 저장 안 함", () => {
    seed({ ...base, status: "paid_early", paidAmount: 30000, savedAmount: 10000, decidedAt: "2026-10-08" });
    render();
    change(/원래 금액/, "50000");
    tapSave();
    expect(screen.getByText(RESET_TITLE)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button").filter((b) => ["취소", "바꾸기"].includes(b.textContent ?? ""));
    expect(buttons.map((b) => b.textContent)).toEqual(["취소", "바꾸기"]);
    expect(stored()[0].amount).toBe(40000);

    fireEvent.click(buttons[0]);
    expect(screen.queryByText(RESET_TITLE)).toBeNull();
    expect(stored()[0].status).toBe("paid_early");

    tapSave();
    fireEvent.click(screen.getByRole("button", { name: "바꾸기" }));
    expect(stored()[0]).toMatchObject({
      amount: 50000,
      status: "open",
      paidAmount: null,
      savedAmount: 0,
      decidedAt: null,
    });
    expect(mockOpenToast).toHaveBeenCalledWith("고지서를 수정했어요");
  });

  it("AC-4[P0]: 없는 id·corrupted는 '고지서를 찾을 수 없어요', 폼은 0개", () => {
    seed(base);
    const first = render("zzz");
    expect(screen.getByText("고지서를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryByLabelText("고지서 이름")).toBeNull();
    first.unmount();

    localStorage.setItem(KEY, "{not json");
    render();
    expect(screen.getByText("고지서를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByLabelText("고지서 이름")).toBeNull();
  });

  it("AC-4[P0]: unavailable은 '저장 공간에 접근할 수 없어요', newerVersion은 '새 버전 앱에서 저장한 데이터가 있어요'", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, notices: [base] }));
    const first = render();
    expect(screen.getByText("새 버전 앱에서 저장한 데이터가 있어요")).toBeInTheDocument();
    expect(screen.queryByLabelText("고지서 이름")).toBeNull();
    first.unmount();

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render();
    expect(screen.getByText("저장 공간에 접근할 수 없어요")).toBeInTheDocument();
    expect(screen.queryByLabelText("고지서 이름")).toBeNull();
  });

  it("AC-5[P1]: 받은 날을 바꾸지 않으면 2019년 받은 날도 5년 하한 오류 없이 저장된다", () => {
    seed({ ...base, receivedDate: "2019-10-05", opinionDeadline: null, paymentDeadline: "2019-11-30" });
    render();
    change("고지서 이름", "옛 고지서");
    tapSave();
    expect(screen.queryByText(/5년/)).toBeNull();
    expect(stored()[0]).toMatchObject({ name: "옛 고지서", receivedDate: "2019-10-05" });
    expect(mockOpenToast).toHaveBeenCalledWith("고지서를 수정했어요");
  });
});
