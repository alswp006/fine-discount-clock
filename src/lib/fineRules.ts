// 법령 기준 상수 — 계산 기준값은 이 파일 한 곳에서만 정의한다.
export const FINE_RULES = {
  DISCOUNT_PERCENT: 20, // 질서위반행위규제법 제18조, 시행령 제5조 (100분의 20 범위 이내)
  SURCHARGE_PERCENT: 3, // 질서위반행위규제법 제24조 제1항
  HEAVY_SURCHARGE_PERMILLE: 12, // 질서위반행위규제법 제24조 제2항 (매 1개월 1천분의 12)
  HEAVY_SURCHARGE_MAX_MONTHS: 60, // 질서위반행위규제법 제24조 제2항
} as const;

export const PENALTY_RULES = {
  FIRST_PERIOD_DAYS: 10, // 도로교통법 제164조 제1항 (첫날 불산입: 민법 제157조)
  SECOND_PERIOD_DAYS: 20, // 도로교통법 제164조 제2항
  SECOND_SURCHARGE_PERCENT: 20, // 도로교통법 제164조 제2항
} as const;

/** 법정 기준이 아닌 앱 입력 오류 방지용 제한 */
export const INPUT_LIMITS = {
  AMOUNT_MIN: 1_000,
  AMOUNT_MAX: 10_000_000,
  NAME_MAX_CHARS: 20, // 코드포인트 기준 (Array.from)
  RECEIVED_MAX_YEARS_AGO: 5,
  DEADLINE_MAX_YEARS_AFTER_RECEIVED: 1,
  MAX_NOTICES: 50,
} as const;
