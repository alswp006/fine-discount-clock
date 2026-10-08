import React from "react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  mockTds,
  mockAppsInToss,
  mockRouter,
  mockNavigate,
} from "@/__tests__/__helpers__/mocks";
import NotFound from "@/pages/NotFound";

mockTds();
mockAppsInToss();
mockRouter();

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/없는/경로"]}>
      <NotFound />
    </MemoryRouter>,
  );
}

describe("NotFound (S5)", () => {
  it("아이콘·제목·'홈으로' 버튼과 한국어 앱 제목을 보여준다", () => {
    const { container } = renderPage();
    expect(container.querySelector("[data-content-icon]")).not.toBeNull();
    expect(screen.getByText("페이지를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByText("과태료 감경시계")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈으로" })).toBeInTheDocument();
  });

  it("'홈으로'를 누르면 navigate('/', {replace:true})가 1회 호출된다", () => {
    mockNavigate.mockClear();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("console.error가 0회다", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
