// Domain types — 런타임 값 없음(타입 전용)

/** 법정 구분이라 닫힌 집합 예외: 과태료(질서위반행위규제법) | 범칙금(도로교통법 통고처분) */
export type NoticeKind = 'fine' | 'penalty';

/** 앱 내부 처리 상태 */
export type NoticeStatus = 'open' | 'paid_early' | 'paid_late' | 'objected';

/** 등록한 고지서 1장 */
export interface Notice {
  id: string;
  name: string;
  kind: NoticeKind;
  amount: number;
  discountedAmount: number | null;
  receivedDate: string;
  opinionDeadline: string | null;
  paymentDeadline: string | null;
  status: NoticeStatus;
  paidAmount: number | null;
  savedAmount: number;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 입력 폼 → 저장 함수로 넘기는 값 */
export type NoticeInput = Pick<
  Notice,
  'name' | 'kind' | 'amount' | 'discountedAmount' | 'receivedDate' | 'opinionDeadline' | 'paymentDeadline'
>;

/** 계산 결과 (저장하지 않는 파생값) */
export interface KeyDeadline {
  date: string; // 'YYYY-MM-DD'
  label: '감경 마감' | '납부기한' | '1차 납부기한' | '2차 납부기한';
  dday: number; // date - today (일)
}

export interface FineComparison {
  discounted: number;
  full: number;
  overdueFirst: number;
  saving: number;
}

/** month 0 = 납부기한 다음 날 */
export interface FineScenarioRow {
  month: number;
  total: number;
  surcharge: number;
}

export interface PenaltyStages {
  firstDeadline: string;
  firstAmount: number;
  secondDeadline: string;
  secondAmount: number;
}

export interface LoadResult {
  notices: Notice[];
  corrupted: boolean;
  backupFailed: boolean;
  unavailable: boolean;
  newerVersion: boolean;
}

export type StoreError =
  | 'quota'
  | 'unavailable'
  | 'limit'
  | 'not_found'
  | 'unbacked'
  | 'newer_version'
  | 'invalid';

/** navigate state */
export interface RouteState {
  justSaved?: boolean;
  focus?: 'paymentDeadline';
  deletedName?: string;
}
