import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockAnalytics } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockAnalytics();

const boom = vi.hoisted(() => ({ on: false }));
vi.mock("@/pages/NoticeResult", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/pages/NoticeResult")>();
  const Actual = actual.default;
  return {
    ...actual,
    default: () => {
      if (boom.on) throw new Error("boom");
      return React.createElement(Actual);
    },
  };
});

import App from "@/App";
import { TodayProvider } from "@/lib/TodayContext";

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

function renderAt(path: string) {
  return render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)));
}

beforeEach(() => {
  boom.on = false;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  localStorage.setItem("fdc:notices:v1", JSON.stringify({ version: 1, notices: [notice] }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("라우팅 연결·ErrorBoundary·TodayProvider 배선·빌드 타깃", () => {
  it("AC-1[P0]: '/'는 Home(앱 제목)을, '/notice/new'는 등록 폼을 렌더한다", () => {
    const home = renderAt("/");
    expect(screen.getByText("과태료 감경시계")).toBeInTheDocument();
    expect(screen.queryByText("페이지를 찾을 수 없어요")).toBeNull();
    home.unmount();
    renderAt("/notice/new");
    expect(screen.getByText("고지서 등록")).toBeInTheDocument();
    expect(screen.queryByText("페이지를 찾을 수 없어요")).toBeNull();
  });

  it("AC-1[P0]: '/notice/n1'은 결과, '/notice/n1/edit'는 수정 폼을 렌더한다", () => {
    const result = renderAt("/notice/n1");
    expect(screen.getByText("강남 주정차")).toBeInTheDocument();
    expect(screen.queryByText("고지서 수정")).toBeNull();
    result.unmount();
    renderAt("/notice/n1/edit");
    expect(screen.getByText("고지서 수정")).toBeInTheDocument();
    expect(screen.queryByText("페이지를 찾을 수 없어요")).toBeNull();
  });

  it("AC-1[P0]: 알 수 없는 경로는 '페이지를 찾을 수 없어요'를 렌더한다", () => {
    renderAt("/unknown/path");
    expect(screen.getByText("페이지를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈으로" })).toBeInTheDocument();
  });

  it("AC-2[P0]: '/notice/new'가 결과 화면(:id=new)으로 매칭되지 않는다", () => {
    renderAt("/notice/new");
    expect(screen.getByText("고지서 등록")).toBeInTheDocument();
    expect(screen.queryByTestId("free-tier")).toBeNull();
    expect(screen.queryByText("고지서 수정")).toBeNull();
  });

  it("AC-3[P0]: 라우트 하위 컴포넌트가 throw하면 오류 화면이 보이고 흰 화면이 아니다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    boom.on = true;
    const { container } = renderAt("/notice/n1");
    expect(screen.getByText("일시적인 문제가 생겼어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
  });

  it("AC-3[P0]: 오류가 없으면 오류 화면은 나타나지 않는다", () => {
    renderAt("/");
    expect(screen.queryByText("일시적인 문제가 생겼어요")).toBeNull();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
  });

  it("AC-1: App이 TodayProvider와 함께 렌더돼도 라우트가 동작한다", () => {
    render(
      React.createElement(
        TodayProvider,
        { value: "2026-10-09" },
        React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
      ),
    );
    expect(screen.getByText("과태료 감경시계")).toBeInTheDocument();
    expect(screen.queryByText("일시적인 문제가 생겼어요")).toBeNull();
  });

  it("AC-4[P0]: App.tsx가 AppErrorBoundary·TodayProvider로 라우트를 감싼다", () => {
    const src = readFileSync("src/App.tsx", "utf8");
    expect(src).toMatch(/<AppErrorBoundary>/);
    expect(src).toMatch(/<TodayProvider/);
    expect(src.indexOf("<AppErrorBoundary>")).toBeLessThan(src.indexOf("<Routes>"));
    expect(src.indexOf("<TodayProvider")).toBeLessThan(src.indexOf("<Routes>"));
  });

  it("AC-4[P0]: vite.config.ts build.target이 ['es2017','safari15']이고 main.tsx는 수정되지 않았다", () => {
    const cfg = readFileSync("vite.config.ts", "utf8");
    expect(cfg).toMatch(/target:\s*\[\s*['"]es2017['"]\s*,\s*['"]safari15['"]\s*\]/);
    expect(cfg.replace(/\/\/.*$/gm, "")).not.toMatch(/external/);
    const diff = execSync("git diff HEAD --stat -- src/main.tsx", { encoding: "utf8" }).trim();
    expect(diff).toBe("");
  });
});
