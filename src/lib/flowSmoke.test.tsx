/**
 * 전체 흐름 스모크 — 홈 → 등록 → 결과 → 기록 → 삭제를 실제 App 라우팅으로 돌리는 동안 console.error 0회.
 * mocks.ts의 vi.mock은 useNavigate를 가짜로 바꾸므로, 테스트 안에서 실제 react-router-dom으로 되돌린 뒤
 * App을 동적으로 불러온다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockAnalytics, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import type { NoticeInput } from "@/lib/types";

mockTds();
mockAppsInToss();
mockAnalytics();

const INPUT: NoticeInput = {
  name: "강남 주정차",
  kind: "fine",
  amount: 40000,
  discountedAmount: null,
  receivedDate: "2026-10-05",
  opinionDeadline: "2026-10-20",
  paymentDeadline: "2026-11-30",
};

describe("전체 흐름 스모크", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-4: 등록부터 삭제까지 console.error 0회, 홈에서 삭제 Toast 1회", async () => {
    vi.doMock("react-router-dom", async () => await vi.importActual("react-router-dom"));
    const { MemoryRouter } = await import("react-router-dom");
    const { default: App } = await import("@/App");

    // TDS 목의 Top이 제목 태그 안에 제목 태그를 그리는 경고(validateDOMNesting h1·h2)는 목의 모양이지 앱 결함이 아니다.
    const errors: unknown[][] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => {
      const nesting = a.some((x) => typeof x === "string" && /validateDOMNesting/.test(x));
      if (nesting && a.some((x) => typeof x === "string" && /^<?h[12]>?$/.test(x))) return;
      errors.push(a);
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    // 홈(빈 상태) → 등록
    expect(screen.getByText("과태료 감경시계")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "고지서 등록" }));
    expect(await screen.findByLabelText("고지서 이름")).toBeInTheDocument();

    // 입력 → 저장
    fireEvent.change(screen.getByLabelText("고지서 이름"), { target: { value: INPUT.name } });
    fireEvent.change(screen.getByLabelText("원래 금액"), { target: { value: String(INPUT.amount) } });
    fireEvent.change(screen.getByLabelText("받은 날"), { target: { value: INPUT.receivedDate } });
    fireEvent.change(screen.getByLabelText("의견제출 기한"), { target: { value: INPUT.opinionDeadline } });
    fireEvent.change(screen.getByLabelText("납부기한"), { target: { value: INPUT.paymentDeadline } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    // 결과
    expect(await screen.findByText(INPUT.name)).toBeInTheDocument();
    expect(mockOpenToast).toHaveBeenCalledWith("고지서를 등록했어요");

    // 기록
    fireEvent.click(screen.getByRole("button", { name: "납부·결정 기록" }));
    fireEvent.click(screen.getAllByText(/납부했어요/)[0]);

    // 삭제
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));

    // 홈 복귀 + 삭제 Toast 1회
    await waitFor(() => expect(screen.getByText("과태료 감경시계")).toBeInTheDocument());
    const deleteToasts = mockOpenToast.mock.calls.filter(([m]) => m === `'${INPUT.name}' 고지서를 삭제했어요`);
    expect(deleteToasts).toHaveLength(1);
    expect(errors.map((e) => e.map(String).join(" ").slice(0, 400))).toEqual([]);
  });
});
