import React, { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import {
  mockTds,
  mockAppsInToss,
  mockRouter,
  mockAnalytics,
  mockLogImpression,
} from "@/__tests__/__helpers__/mocks";
import NoticeResult from "@/pages/NoticeResult";

mockTds();
mockAppsInToss();
mockRouter();
mockAnalytics();

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  mockLogImpression.mockClear();
  localStorage.setItem("fdc:notices:v1", JSON.stringify({ version: 1, notices: [notice] }));
});

describe("NoticeResult", () => {
  it("StrictMode에서도 result_free_tier 노출 로그는 1회", () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/notice/n1"]}>
          <Routes>
            <Route path="/notice/:id" element={<NoticeResult />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );
    expect(screen.getByTestId("free-tier")).toBeInTheDocument();
    expect(mockLogImpression.mock.calls.filter((c) => c[0] === "result_free_tier")).toHaveLength(1);
  });
});
