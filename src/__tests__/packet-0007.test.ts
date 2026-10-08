import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import StatusState from "@/components/StatusState";
import AppErrorBoundary from "@/components/AppErrorBoundary";

mockAll();

const h = React.createElement;
const wrap = (ui: React.ReactElement) => render(h(MemoryRouter, null, ui));

function Boom(): React.ReactElement {
  throw new Error("렌더 중 오류");
}

describe("공용 차단 상태 화면(StatusState)과 렌더 오류 ErrorBoundary", () => {
  it("AC-1: variant=unavailable이면 저장 공간 접근 불가 문구와 재실행 안내가 보인다", () => {
    wrap(h(StatusState, { variant: "unavailable" }));
    expect(screen.getByText("저장 공간에 접근할 수 없어요")).toBeInTheDocument();
    expect(screen.getByText("토스 앱을 다시 실행한 뒤 시도해 주세요")).toBeInTheDocument();
  });

  it("AC-1: variant=newer이면 새 버전 앱 저장 데이터 문구가 보인다", () => {
    wrap(h(StatusState, { variant: "newer" }));
    expect(screen.getByText("새 버전 앱에서 저장한 데이터가 있어요")).toBeInTheDocument();
    expect(screen.queryByText("저장 공간에 접근할 수 없어요")).toBeNull();
  });

  it("AC-1: variant=notFound이면 고지서를 찾을 수 없다는 문구가 보인다", () => {
    wrap(h(StatusState, { variant: "notFound" }));
    expect(screen.getByText("고지서를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByText("새 버전 앱에서 저장한 데이터가 있어요")).toBeNull();
  });

  it("AC-2: actionLabel+onAction을 주면 버튼이 렌더되고 탭하면 onAction이 1회 호출된다", () => {
    const onAction = vi.fn();
    wrap(h(StatusState, { variant: "notFound", actionLabel: "목록으로", onAction }));
    const btn = screen.getByRole("button", { name: "목록으로" });
    expect(btn).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("AC-2: actionLabel을 주지 않으면 버튼이 없다", () => {
    wrap(h(StatusState, { variant: "unavailable" }));
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

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

    it("AC-3: 자식이 렌더 중 throw하면 오류 안내 문구와 '다시 시도' 버튼이 보인다", () => {
      wrap(h(AppErrorBoundary, null, h(Boom)));
      expect(screen.getByText("일시적인 문제가 생겼어요")).toBeInTheDocument();
      expect(screen.getByText("다시 시도해도 계속되면 토스 앱을 다시 실행해 주세요")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    });

    it("AC-3: '다시 시도'를 탭하면 window.location.reload가 1회 호출된다", () => {
      wrap(h(AppErrorBoundary, null, h(Boom)));
      expect(reload).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it("AC-3: 자식이 정상이면 그대로 렌더하고 오류 화면은 없다", () => {
      wrap(h(AppErrorBoundary, null, h("p", null, "정상 화면")));
      expect(screen.getByText("정상 화면")).toBeInTheDocument();
      expect(screen.queryByText("일시적인 문제가 생겼어요")).toBeNull();
    });
  });
});
