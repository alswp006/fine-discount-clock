/**
 * 검수 대응 정적 가드 — src/**\/*.{ts,tsx,css}를 읽어 금지 패턴이 0건인지 확인한다.
 * 위반이 나오면 소스를 고치지 말고 보고 목록에 남긴다(패킷 지침) — 실패 메시지가 곧 목록이다(파일:라인).
 *
 * 제외 규칙(이 둘만 — 넓히지 마라):
 * 1. 테스트 파일(*.test.ts·*.test.tsx)과 src/__tests__/ — 금지 패턴을 "찾는 쪽"이라 정규식·픽스처 문자열에
 *    패턴 자체가 들어 있다(이 파일도 그렇다). 번들에 들어가지 않는다.
 * 2. 주석(블록 주석, 줄 시작 //) — 사용 예시·설명은 실행되지 않는다. 줄 번호는 유지한다.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : walk(p);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*\/\//.test(l) ? "" : l))
    .join("\n");
}

const files = walk(SRC).map((p) => ({ path: relative(process.cwd(), p), text: stripComments(readFileSync(p, "utf8")) }));

function hits(pattern: RegExp): string[] {
  const out: string[] = [];
  for (const f of files) {
    f.text.split("\n").forEach((line, i) => {
      if (pattern.test(line)) out.push(`${f.path}:${i + 1}  ${line.trim()}`);
    });
  }
  return out;
}

describe("검수 대응 정적 가드", () => {
  it("스캔 대상 파일이 실제로 읽힌다", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.path.endsWith(".css"))).toBe(true);
    expect(files.some((f) => /\.test\.tsx?$/.test(f.path))).toBe(false);
  });

  it("AC-1: 외부 이탈·설치 유도·외부 분석 SDK 패턴이 0건이다", () => {
    const found = [
      /window\.open\(/,
      /window\.location\.href\s*=\s*['"`]http/,
      /<a\s[^>]*href=["']http/,
      /앱을 설치/,
      /다운로드/,
      /google-analytics/i,
      /gtag/,
      /amplitude/i,
      /mixpanel/i,
    ].flatMap((p) => hits(p));
    expect(found).toEqual([]);
  });

  it("AC-2: HEX 색상 리터럴이 0건이다", () => {
    expect(hits(/#[0-9a-fA-F]{3,8}\b/)).toEqual([]);
  });

  it("AC-2: var(--tds-color- 가 0건이다", () => {
    expect(hits(/var\(--tds-color-/)).toEqual([]);
  });

  it("AC-3: 호환 불가 API(crypto.randomUUID·structuredClone·findLast·Object.hasOwn·.at()가 0건이다", () => {
    expect(hits(/crypto\.randomUUID|structuredClone|\.findLast\(|Object\.hasOwn|\.at\(/)).toEqual([]);
  });

  it("AC-3: IAP·프로모션(TossPurchase·IAP.·grantPromotionReward)이 0건이다", () => {
    expect(hits(/TossPurchase|\bIAP\.|grantPromotionReward/)).toEqual([]);
  });

  it("AC-5: AdSlot을 감싼 요소와 .ad-slot 규칙에 height·min-height·background가 없다", () => {
    const users = files.filter((f) => f.path.endsWith(".tsx") && /<AdSlot\b/.test(f.text));
    expect(users.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const f of users) {
      const lines = f.text.split("\n");
      lines.forEach((line, i) => {
        if (!/<AdSlot\b/.test(line)) return;
        // 바로 위 몇 줄에서 AdSlot을 여는 래퍼 태그를 찾는다
        const above = lines.slice(Math.max(0, i - 4), i).join("\n");
        const wrapper = above.match(/<(div|section|span)\b[^>]*>\s*$/);
        if (wrapper && /style=|height|min-?height|background/i.test(wrapper[0])) {
          violations.push(`${f.path}:${i + 1}  ${wrapper[0].trim()}`);
        }
      });
    }

    // AdSlot 자신의 컨테이너도 style 없이 ref만 가진다
    const ad = files.find((f) => f.path.endsWith("components/AdSlot.tsx"));
    expect(ad).toBeDefined();
    if (ad && /<div[^>]*ref=\{containerRef\}[^>]*style=/.test(ad.text)) {
      violations.push(`${ad.path}  containerRef div에 style`);
    }

    for (const f of files.filter((x) => x.path.endsWith(".css"))) {
      for (const m of f.text.matchAll(/\.ad-slot[^{]*\{([^}]*)\}/g)) {
        if (/height|background/i.test(m[1])) violations.push(`${f.path}  .ad-slot { ${m[1].trim()} }`);
      }
    }
    expect(violations).toEqual([]);
  });
});
