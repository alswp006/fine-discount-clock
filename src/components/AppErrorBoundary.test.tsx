import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import AppErrorBoundary from "@/components/AppErrorBoundary";

mockAll();

function Boom(): never {
  throw new Error("렌더 중 오류");
}

describe("AppErrorBoundary", () => {
  const originalLocation = window.location;
  const reload = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("자식이 throw하면 renderError 화면과 '다시 시도' 버튼을 보인다", () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByTestId("status-state-renderError")).toBeInTheDocument();
    expect(screen.getByText("일시적인 문제가 생겼어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("'다시 시도'를 누르면 reload가 1회 호출된다", () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
