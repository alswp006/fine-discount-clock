/**
 * 검수 대응 정적 가드 + 전체 흐름 스모크.
 * 위반이 나오면 해당 파일을 고치지 말고 보고 목록에 남긴다(패킷 지침) — 실패 메시지가 곧 목록이다.
 * 정적 가드 제외 규칙: 테스트 파일(*.test.ts(x)·__tests__/)과 주석은 보지 않는다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockAnalytics, mockOpenToast } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockAnalytics();

// mocks.ts의 vi.mock은 모듈 최상단으로 끌어올려져 react-router-dom의 useNavigate를 항상 가짜로 만든다.
// 흐름 스모크는 실제 이동이 필요하므로 아래 테스트 안에서 실제 라우터로 되돌린 뒤 App을 동적으로 불러온다.

// ───────────────────────── 정적 가드 ─────────────────────────
const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : walk(p);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/** 블록 주석과 줄 주석(줄 시작 //)을 지운다. 줄 번호는 유지한다. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*\/\//.test(l) ? "" : l))
    .join("\n");
}

const FILES = walk(SRC).map((p) => ({ path: relative(process.cwd(), p), text: stripComments(readFileSync(p, "utf8")) }));

function hits(pattern: RegExp): string[] {
  const out: string[] = [];
  for (const f of FILES) {
    f.text.split("\n").forEach((line, i) => {
      if (pattern.test(line)) out.push(`${f.path}:${i + 1}  ${line.trim()}`);
    });
  }
  return out;
}

describe("검수 대응 정적 가드", () => {
  it("AC-1[P0]: 외부 이탈·설치 유도·외부 분석 SDK 패턴이 src에 0건이다", () => {
    expect(FILES.length).toBeGreaterThan(20);
    const patterns = [
      /window\.open\(/,
      /window\.location\.href\s*=\s*['"`]http/,
      /<a\s[^>]*href=["']http/,
      /앱을 설치/,
      /다운로드/,
      /google-analytics/i,
      /gtag/,
      /amplitude/i,
      /mixpanel/i,
    ];
    const found = patterns.flatMap((p) => hits(p));
    expect(found).toEqual([]);
    expect(found).toHaveLength(0);
  });

  it("AC-2[P0]: HEX 색상 리터럴과 var(--tds-color- 가 src에 0건이다", () => {
    // 테스트 파일은 walk에서 이미 제외. #root 같은 비-HEX 셀렉터는 정규식에 걸리지 않는다.
    const hex = hits(/#[0-9a-fA-F]{3,8}\b/);
    const tds = hits(/var\(--tds-color-/);
    expect(hex).toEqual([]);
    expect(tds).toEqual([]);
  });

  it("AC-3[P0]: 호환 불가 API 사용이 src에 0건이다", () => {
    const found = hits(/crypto\.randomUUID|structuredClone|\.findLast\(|Object\.hasOwn|\.at\(/);
    expect(found).toEqual([]);
    expect(found).toHaveLength(0);
  });

  it("AC-3[P0]: IAP·프로모션 사용(TossPurchase, IAP., grantPromotionReward)이 src에 0건이다", () => {
    const found = hits(/TossPurchase|\bIAP\.|grantPromotionReward/);
    expect(found).toEqual([]);
    expect(found).toHaveLength(0);
  });

  it("AC-5[P1]: AdSlot을 감싼 요소와 .ad-slot 규칙에 height·min-height·background가 없다", () => {
    const users = FILES.filter((f) => f.path.endsWith(".tsx") && /<AdSlot\b/.test(f.text));
    expect(users.length).toBeGreaterThan(0); // Home이 쓴다

    const violations: string[] = [];
    for (const f of users) {
      const lines = f.text.split("\n");
      lines.forEach((line, i) => {
        if (!/<AdSlot\b/.test(line)) return;
        // 바로 앞의 여는 태그(들여쓰기가 더 얕은 가장 가까운 줄) 몇 줄을 본다
        const above = lines.slice(Math.max(0, i - 4), i).join("\n");
        const wrapper = above.match(/<(div|section|span)\b[^>]*>\s*$/);
        if (wrapper && /style=|height|min-?height|background/i.test(wrapper[0])) {
          violations.push(`${f.path}:${i + 1}  ${wrapper[0].trim()}`);
        }
      });
    }
    // AdSlot 자신의 컨테이너도 style 없이 ref만 가진다
    const ad = FILES.find((f) => f.path.endsWith("components/AdSlot.tsx"));
    expect(ad).toBeDefined();
    expect(/<div[^>]*ref=\{containerRef\}[^>]*style=/.test(ad!.text)).toBe(false);

    // CSS의 .ad-slot 규칙
    for (const f of FILES.filter((x) => x.path.endsWith(".css"))) {
      for (const m of f.text.matchAll(/\.ad-slot[^{]*\{([^}]*)\}/g)) {
        if (/height|background/i.test(m[1])) violations.push(`${f.path}  .ad-slot { ${m[1].trim()} }`);
      }
    }
    expect(violations).toEqual([]);
  });
});

// ───────────────────────── 흐름 스모크 ─────────────────────────
describe("전체 흐름 스모크", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-4[P0]: 홈 → 등록 → 결과 → 기록 → 삭제 동안 console.error 0회, 홈에서 삭제 Toast 1회", async () => {
    vi.doMock("react-router-dom", async () => await vi.importActual("react-router-dom"));
    const { MemoryRouter } = await import("react-router-dom");
    const { default: App } = await import("@/App");
    // TDS 목의 Top이 제목 태그 안에 제목 태그를 그리는 경고(validateDOMNesting h1·h2)는 목의 모양이지 앱의 결함이 아니다.
    const errors: unknown[][] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => {
      const nesting = a.some((x) => typeof x === "string" && /validateDOMNesting/.test(x));
      if (nesting && a.some((x) => typeof x === "string" && /^<?h[12]>?$/.test(x))) return;
      errors.push(a);
    });
    render(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)));

    // 홈(빈 상태) → 등록
    expect(screen.getByText("과태료 감경시계")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "고지서 등록" }));
    expect(await screen.findByLabelText("고지서 이름")).toBeInTheDocument();
    expect(screen.queryByText("과태료 감경시계")).toBeNull();

    // 입력 → 저장
    fireEvent.change(screen.getByLabelText("고지서 이름"), { target: { value: "강남 주정차" } });
    fireEvent.change(screen.getByLabelText("원래 금액"), { target: { value: "40000" } });
    fireEvent.change(screen.getByLabelText("받은 날"), { target: { value: "2026-10-05" } });
    fireEvent.change(screen.getByLabelText("의견제출 기한"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("납부기한"), { target: { value: "2026-11-30" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    // 결과
    expect(await screen.findByText("강남 주정차")).toBeInTheDocument();
    expect(mockOpenToast).toHaveBeenCalledWith("고지서를 등록했어요");

    // 기록
    fireEvent.click(screen.getByRole("button", { name: "납부·결정 기록" }));
    const option = screen.getAllByText(/납부했어요/)[0];
    fireEvent.click(option);

    // 삭제
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));

    // 홈 복귀 + 삭제 Toast 1회
    await waitFor(() => expect(screen.getByText("과태료 감경시계")).toBeInTheDocument());
    const deleteToasts = mockOpenToast.mock.calls.filter(([m]) => m === "'강남 주정차' 고지서를 삭제했어요");
    expect(deleteToasts).toHaveLength(1);
    expect(errors.map((e) => e.map(String).join(" ").slice(0, 400))).toEqual([]);
  });
});
