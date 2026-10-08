import { describe, it, expect, vi, beforeEach } from "vitest";
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
  status: "paid_early",
  paidAmount: 30000,
  savedAmount: 10000,
  decidedAt: "2026-10-08",
  createdAt: T0,
  updatedAt: T0,
};
const stored = () => (JSON.parse(localStorage.getItem(KEY) ?? "null") as { notices: Notice[] }).notices;
const render = (id = "n1") =>
  renderWithRouter(h(Routes, null, h(Route, { path: "/notice/:id/edit", element: h(NoticeEdit) })), {
    initialEntries: [`/notice/${id}/edit`],
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  localStorage.setItem(KEY, JSON.stringify({ version: 1, notices: [base] }));
  mockLocation.state = null;
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
});

describe("NoticeEdit", () => {
  it("저장값으로 프리필하고, 이름만 바꾸면 납부 기록을 유지한다", () => {
    render();
    expect((screen.getByLabelText("고지서 이름") as HTMLInputElement).value).toBe("강남 주정차");
    fireEvent.change(screen.getByLabelText("고지서 이름"), { target: { value: "역삼 주정차" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(stored()[0]).toMatchObject({ name: "역삼 주정차", status: "paid_early", paidAmount: 30000 });
    expect(mockOpenToast).toHaveBeenCalledWith("고지서를 수정했어요");
  });

  it("금액을 바꾸면 다이얼로그를 거쳐 open으로 되돌린 뒤 저장한다", () => {
    render();
    fireEvent.change(screen.getByLabelText(/원래 금액/), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(stored()[0].status).toBe("paid_early");
    fireEvent.click(screen.getByRole("button", { name: "바꾸기" }));
    expect(stored()[0]).toMatchObject({ amount: 50000, status: "open", paidAmount: null, decidedAt: null });
  });

  it("없는 id면 StatusState만 보이고 폼은 없다", () => {
    render("zzz");
    expect(screen.getByText("고지서를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByLabelText("고지서 이름")).toBeNull();
  });
});
