import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  mockTds,
  mockAppsInToss,
  mockRouter,
  mockNavigate,
} from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockRouter();

import NotFound from "@/pages/NotFound";

function renderPage() {
  return render(
    React.createElement(MemoryRouter, { initialEntries: ["/없는/경로"] }, React.createElement(NotFound)),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("[부가] 없는 경로 페이지(S5) NotFound", () => {
  it("AC-1[P0]: Asset.ContentIcon, 제목, '홈으로' 버튼이 보인다", () => {
    const { container } = renderPage();
    expect(container.querySelector("[data-content-icon]")).not.toBeNull();
    expect(screen.getByText("페이지를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈으로" })).toBeInTheDocument();
  });

  it("AC-1[P0]: Top 제목은 한국어 앱 이름이고 영문 이름은 없다", () => {
    renderPage();
    expect(screen.getByText("과태료 감경시계")).toBeInTheDocument();
    expect(screen.queryByText(/fine.?discount.?clock/i)).toBeNull();
    expect(screen.queryByText(/준비 중/)).toBeNull();
  });

  it("AC-1[P0]: StatusState route404 영역으로 렌더되고 버튼은 하나뿐이다", () => {
    renderPage();
    expect(screen.getByTestId("status-state-route404")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("AC-2[P0]: '홈으로' 탭하면 navigate('/', {replace:true})가 1회 호출된다", () => {
    mockNavigate.mockClear();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("AC-2[P0]: 탭하기 전에는 navigate가 호출되지 않는다", () => {
    mockNavigate.mockClear();
    renderPage();
    expect(mockNavigate).toHaveBeenCalledTimes(0);
    expect(screen.getByRole("button", { name: "홈으로" })).toBeEnabled();
  });

  it("AC-3[P0]: 렌더와 탭 동안 console.error가 0회다", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(err).toHaveBeenCalledTimes(0);
    expect(screen.getByText("페이지를 찾을 수 없어요")).toBeInTheDocument();
  });

  it("AC-3[P0]: 소스에 HEX 색상 하드코딩이 0건이고 자리 페이지 마커가 없다", () => {
    const src = readFileSync("src/pages/NotFound.tsx", "utf8");
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toHaveLength(0);
    expect(src).not.toContain("@ai-factory:placeholder");
  });
});
