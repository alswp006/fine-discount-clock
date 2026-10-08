# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** StatusState variant 값. 0009, 0016, 0017, 0018이 참조한다. (구현: 패킷 0007) */
export type StatusVariant = 'notFound' | 'unavailable' | 'newer' | 'route404' | 'renderError';

/** Array.from 기준 글자 수. (구현: 패킷 0002) */
export type countCharsFn = (s: string) => number;

/** YYYY-MM-DD 형식이면서 실제 달력 날짜인지 판정. (구현: 패킷 0002) */
export type isValidYmdFn = (s: string) => boolean;

/** YYYY-MM-DD 입력, YYYY-MM-DD 출력. (구현: 패킷 0002) */
export type addYearsFn = (ymd: string, years: number) => string;

/** YYYY-MM-DD 입력, YYYY-MM-DD 출력. (구현: 패킷 0002) */
export type addDaysFn = (ymd: string, days: number) => string;

/** 로컬 날짜를 YYYY-MM-DD로 반환. (구현: 패킷 0002) */
export type todayYmdFn = () => string;

/** toLocaleString('ko-KR') 후 '원'을 붙인다. (구현: 패킷 0002) */
export type formatWonFn = (amount: number) => string;

/** '2026.10.20(화)' 형식. (구현: 패킷 0002) */
export type formatDateDotFn = (ymd: string) => string;

/** 'D-11', 'D-DAY', 'D+1' 형식. days는 마감일까지 남은 일수로 가정. (구현: 패킷 0002) */
export type formatDdayFn = (days: number) => string;

/** TodayContext Provider가 주입한 오늘 날짜(YYYY-MM-DD)를 반환한다. (구현: 패킷 0006) */
export type useTodayFn = () => string;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    analytics.ts
    contract.ts
    dateUtils.test.ts
    dateUtils.ts
    fineRules.ts
    format.ts
    inputRules.test.ts
    inputRules.ts
    review.ts
    share.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    NotFound.tsx
    NoticeCreate.tsx
    NoticeResult.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- analytics.ts: export type LogFields = Record<string, string | number | boolean | null>; export const DWELL_MS = 3000; export function fireAndForget(call: () => unknown): void; export function logScreen(page: string, extra?: LogFields): void; export function logClick(name: string, extra?: LogFields): void; export function logImpression(name: string, extra?: LogFields): void; export function useScreenLog(page: string): void
- contract.ts: export type StatusVariant = 'notFound' | 'unavailable' | 'newer' | 'route404' | 'renderError'; export type countCharsFn = (s: string) => number; export type isValidYmdFn = (s: string) => boolean; export type addYearsFn = (ymd: string, years: number) => string; export type addDaysFn = (ymd: string, days: number) => string; export type todayYmdFn = () => string; export type formatWonFn = (amount: number) => string; export type formatDateDotFn = (ymd: string) => string
- dateUtils.ts: export function ymdToDayNumber(ymd: string): number; export function addDays(ymd: string, days: number): string; export function diffDays(a: string, b: string): number; export function todayYmd(): string
- fineRules.ts: export const FINE_RULES =; export const PENALTY_RULES =; export const INPUT_LIMITS =
- format.ts: export function formatWon(amount: number): string; export function formatDateDot(ymd: string): string; export function formatDday(days: number): string
- inputRules.ts: export type AmountParse = |; export function parseAmountInput(raw: string): AmountParse; export function countChars(s: string): number; export function isValidYmd(s: string): boolean; export function addYears(ymd: string, years: number): string
- review.ts: export function requestReviewOnce(key: string = REVIEW_REQUESTED_KEY): void
- share.ts: export interface ShareAppOptions; export async function shareApp(opts: ShareAppOptions): Promise<void>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type NoticeKind = 'fine' | 'penalty'; export type NoticeStatus = 'open' | 'paid_early' | 'paid_late' | 'objected'; export interface Notice; export type NoticeInput = Pick< Notice, 'name' | 'kind' | 'amount' | 'discountedAmount' | 'receivedDate' | 'opinionDeadl; export interface KeyDeadline; export interface FineComparison; export interface FineScenarioRow; export interface PenaltyStages
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/format.ts → imports: lib/dateUtils
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티·결과·RouteState 타입과 법령 기준 상수 (files: src/lib/types.ts, src/lib/fineRules.ts)
- 0002: 입력 해석·날짜 산술·표시 포맷 순수 함수 (files: src/lib/inputRules.ts, src/lib/inputRules.test.ts, src/lib/dateUtils.ts, src/lib/dateUtils.test.ts, src/lib/format.ts)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/lib/analytics.ts
export type LogFields = Record<string, string | number | boolean | null>;
export const DWELL_MS = 3000;
export function fireAndForget(call: () => unknown): void {
export function logScreen(page: string, extra?: LogFields): void {
export function logClick(name: string, extra?: LogFields): void {
export function logImpression(name: string, extra?: LogFields): void {
export function useScreenLog(page: string): void {

// src/lib/contract.ts
export type StatusVariant = 'notFound' | 'unavailable' | 'newer' | 'route404' | 'renderError';
export type countCharsFn = (s: string) => number;
export type isValidYmdFn = (s: string) => boolean;
export type addYearsFn = (ymd: string, years: number) => string;
export type addDaysFn = (ymd: string, days: number) => string;
export type todayYmdFn = () => string;
export type formatWonFn = (amount: number) => st

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(14), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 진입점 라우터 배선은 맨 끝에 두지 말고 기반 패킷 직후 플레이스홀더 페이지와 함께 먼저 병합하라. 화면 패킷은 그 플레이스홀더를 교체하게 해서, 언제 중단돼도 병합된 화면에 도달할 수 있게 하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 파일 생성 전 디렉토리 구조 확인 — mkdir -p로 경로 보장 (60% · 타 앱 1회 — 맹신 금지)
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)