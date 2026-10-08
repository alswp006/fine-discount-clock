import { describe, it, expect, vi } from "vitest";
// 이 패킷은 순수 함수만 다룬다(UI 없음). TDS·react-router·AppState 목은 필요 없다.
import { parseAmountInput, countChars, addYears, isValidYmd } from "@/lib/inputRules";
import { addDays, diffDays, todayYmd } from "@/lib/dateUtils";
import { formatWon, formatDateDot, formatDday } from "@/lib/format";

describe("입력 해석·날짜 산술·표시 포맷 순수 함수", () => {
  it("AC-1[P0]: parseAmountInput은 원·만원 표기를 숫자 digits로 해석하고, 소수점·음수는 거부한다", () => {
    // 정상 입력: 콤마와 '원' 접미사는 떼고 숫자만 남긴다
    expect(parseAmountInput("40,000원")).toEqual({ kind: "ok", digits: "40000" });
    // '만원'은 단위를 해석하지 않고 앞의 숫자만 digits로 돌려준다(명세 그대로)
    expect(parseAmountInput("4만원")).toEqual({ kind: "ok", digits: "4" });
    // 거부: 소수점·음수 기호가 있으면 kind가 'ok'가 아니고 digits도 없어야 한다
    const decimal = parseAmountInput("1.5");
    expect(decimal.kind).not.toBe("ok");
    expect(decimal).not.toHaveProperty("digits");
    const negative = parseAmountInput("-100");
    expect(negative.kind).not.toBe("ok");
    expect(negative).not.toHaveProperty("digits");
  });

  it("AC-2[P0]: isValidYmd는 실제 달력에 존재하는 YYYY-MM-DD만 true로 본다", () => {
    // 윤년: 2028은 윤년이라 2월 29일이 존재한다
    expect(isValidYmd("2028-02-29")).toBe(true);
    expect(isValidYmd("2026-12-31")).toBe(true);
    // 평년 2월 29일, 2월 30일, 4월 31일은 달력에 없다
    expect(isValidYmd("2026-02-29")).toBe(false);
    expect(isValidYmd("2026-02-30")).toBe(false);
    expect(isValidYmd("2026-04-31")).toBe(false);
  });

  it("AC-3[P0]: countChars는 코드포인트 기준으로 세고, addYears는 연도만 옮긴다", () => {
    // 이모지 하나는 UTF-16 길이가 2지만 글자 하나로 센다(Array.from 기준)
    expect(countChars("🚗".repeat(20))).toBe(20);
    expect("🚗".repeat(20).length).toBe(40);
    // 5년 전: 연도만 바뀌고 월·일은 그대로
    expect(addYears("2026-10-09", -5)).toBe("2021-10-09");
  });

  it("AC-4[P0]: diffDays는 두 날짜 차이를 일수로, addDays는 날짜를 더한다", () => {
    // 10월 20일과 10월 9일 사이는 11일
    expect(diffDays("2026-10-20", "2026-10-09")).toBe(11);
    // 10월 5일 + 10일 = 10월 15일
    expect(addDays("2026-10-05", 10)).toBe("2026-10-15");
    // 월 경계를 넘어가도 달력대로 계산한다(1월 31일 + 1일 = 2월 1일)
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("AC-5[P0]: formatDateDot·formatDday·formatWon은 화면 표시 문자열을 만든다", () => {
    // 2026-10-20은 화요일
    expect(formatDateDot("2026-10-20")).toBe("2026.10.20(화)");
    // D-day: 0이면 'D-DAY', 양수는 'D-n', 지난 날짜는 'D+n'
    expect(formatDday(0)).toBe("D-DAY");
    expect(formatDday(11)).toBe("D-11");
    expect(formatDday(-1)).toBe("D+1");
    // 원화: 천 단위 콤마 + '원'
    expect(formatWon(32000)).toBe("32,000원");
  });

  it("todayYmd는 로컬 시각 기준 오늘 날짜를 YYYY-MM-DD로 준다", () => {
    // 날짜·오늘 의존 테스트: 시계를 고정한다(로컬 생성자로 TZ에 흔들리지 않게)
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 9, 9, 0, 0));
    expect(todayYmd()).toBe("2026-10-09");
    // 자정 직전에도 로컬 날짜가 그대로여야 한다(UTC 변환으로 하루 밀리면 안 된다)
    vi.setSystemTime(new Date(2026, 9, 9, 23, 59, 0));
    expect(todayYmd()).toBe("2026-10-09");
  });
});
