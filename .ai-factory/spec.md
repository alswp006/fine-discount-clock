# SPEC 변경 요약: 저장소 스키마 보강

저장소 스키마 점검에서 ISSUE로 나온 8건을 모두 고쳤습니다. 새 SQL 테이블이나 인덱스, 타임스탬프 컬럼은 추가하지 않았습니다. 기존 `createdAt`·`updatedAt`은 그대로 두고 쓰기 규칙만 정했습니다. 백업 키에는 `savedAt`을 넣지 않았습니다. 이 값을 읽는 AC가 없기 때문입니다.

| 점검 항목 | 해결 방식 | 추가·수정한 AC |
|---|---|---|
| `fdc:notices:v1` 버전 정책: v2가 손상으로 처리되어 덮어써짐 | 버전이 `CURRENT_SCHEMA_VERSION`보다 크면 손상이 아니라 `newerVersion`으로 본다. 모든 쓰기를 `'newer_version'`으로 막는다. 낮은 버전은 `migrateNoticesData`로 순서대로 변환한다. 키 이름은 바꾸지 않는다 | F1-AC-9(수정), F1-AC-19, F1-AC-20, F2-AC-17, F3-AC-13, F4-AC-8(수정), F5-AC-11 |
| 불변식 미검사 (기한 없는 과태료, 기한 역전, 범칙금의 의견제출 기한, open인데 decidedAt 있음, 금액·이름 범위) | 로드 검증 규칙 표에 불변식을 넣고, 위반하면 손상 처리 경로로 보낸다. 쓰기 직전에도 같은 함수로 검증한다(`'invalid'`) | F1-AC-15 |
| 날짜 필드 형식 미검사 | `isValidYmd`로 `YYYY-MM-DD` 형식과 실제 달력 날짜인지 확인한다. createdAt·updatedAt은 `toISOString()` 형식인지 확인한다 | F1-AC-16, F2-AC-4(참조 추가) |
| 50장 초과·중복 id가 로드됨 | 둘 다 손상 처리한다 | F1-AC-17 |
| `updatedAt` 쓰기 규칙 없음 | 신규 저장, 수정, 상태 기록 때 갱신한다. 실패한 쓰기에서는 바꾸지 않는다 | F1-AC-18 |
| `fdc:notices:corrupt`에 스키마 버전 없음 | `{ version: 1; backups: { raw: string }[] }`로 바꾼다. 형식이 다른 기존 값(맨 문자열)은 버리지 않고 첫 항목으로 넣는다 | F1-AC-21 |
| 백업 키 읽기 경로 미정의 | 쓰기 전용 키로 둔다. 읽는 곳은 `loadNotices`(중복 확인·추가)와 `saveNotice`(백업 여부 판정) 두 곳뿐이다. 복원 UI는 Open Questions 9로 남겼다 | 저장소 표, Open Questions 9 |
| 이전 백업이 조용히 덮어써짐 | 덮어쓰지 않고 쌓으며 최대 3개까지 둔다. 가득 차면 `backupFailed: true`이고 F1-AC-13 확인 절차를 거친다 | F1-AC-8(수정), F1-AC-13(수정), F1-AC-21, F2-AC-10(수정) |

이번 수정으로 함께 바뀐 곳:
- `LoadResult`에 `newerVersion` 필드를 추가했습니다.
- 오류 코드에 `'newer_version'`·`'invalid'`를 추가했습니다.
- 검증·마이그레이션 함수를 넣을 모듈 `src/lib/noticeSchema.ts`를 새로 정했습니다.
- 그 밖에 F2-AC-6, F6-AC-9, S1~S4 상태 목록, Assumptions, Open Questions를 고쳤습니다.

---

# SPEC — Fine Discount Clock
앱 이름: 과태료 감경시계 / Fine Discount Clock

## Value Contract
- 결과: 이 앱을 쓰면 사용자는 고지서마다 감경 마감 전에 감경가로 낼지, 의견제출을 할지 이번 주 안에 정한다.
- 바뀌는 행동: 고지서를 서랍에 넣어 두고 잊는 대신, 의견제출 기한(감경 마감) 전에 원래 금액의 80%로 납부하거나 의견제출을 한다. 범칙금은 1차 납부기한 안에 납부한다.
- 매번 얻는 결과물: 고지서별 D-day 카드(예: "D-11 · 2026.10.20(화)")와 금액 비교 카드. 비교 카드에는 "감경 납부액 32,000원 / 감경 기한 후 40,000원 / 체납 시 41,200원부터"가 표시된다.
- 앱이 더하는 것: 사용자가 보통 모르는 공개 법령 규칙을 계산에 넣는다.
  - ① 의견제출 기한 안에 자진 납부하면 과태료를 감경한다(질서위반행위규제법 제18조, 같은 법 시행령 제5조: 100분의 20 범위 이내).
  - ② 납부기한을 넘기면 가산금 3%가 붙는다(같은 법 제24조 제1항).
  - ③ 그 뒤로는 매 1개월마다 중가산금 1.2%가 붙고, 최대 60개월까지 붙는다(같은 법 제24조 제2항).
  - ④ 범칙금은 통고처분서를 받은 날부터 10일 안에 내야 한다. 이 기간이 지나면 20일 안에 20%를 더해 낸다(도로교통법 제164조). 그래도 내지 않으면 즉결심판이 청구된다(도로교통법 제165조).
  - ⑤ 기간 계산에서 첫날은 넣지 않는다(민법 제157조).
- 앱 없이: 법령정보센터에서 위 조문을 찾아 읽는다. 계산기로 감경액과 월별 가산금을 계산하고 달력에 기한을 적는다. 고지서 1장에 10~15분 걸린다.
- Value AC: F3-AC-1

## Common Principles
- 스택: Vite + React + TypeScript, `@toss/tds-mobile`, `react-router-dom`, localStorage. 서버 코드와 외부 API는 없다.
- 화면 골격
  - 모든 화면은 템플릿의 `ScreenScaffold`(또는 `PageShell`)로 감싼다.
  - 상단은 TDS `Top`을 쓰고 제목은 "과태료 감경시계"다. 하위 화면은 화면별 한국어 제목을 쓴다.
  - 하단 탭은 쓰지 않는다. 화면이 4개뿐이라 탭 내비게이션이 필요 없다.
- 여백: TDS 내장 여백을 그대로 쓴다. 간격은 `Spacing size={n}`으로만 조절한다. 커스텀 CSS는 flex/grid 배치에만 쓴다.
- 색상: HEX 하드코딩을 금지한다. `var(--adaptiveGrey600)` 같은 `var(--adaptive*)` 변수나 TDS 컴포넌트 색만 쓴다. 다크모드를 지원한다.
- 터치: 모든 인터랙티브 요소는 터치 영역이 44×44px 이상이다.
- 날짜
  - 기기 로컬 날짜(Asia/Seoul)를 `'YYYY-MM-DD'` 문자열로 다룬다.
  - D-day는 달력 날짜 차이(일)로 계산한다. 0은 "D-DAY", 양수 n은 "D-n", 음수 −n은 "D+n"(기한 지남)으로 표시한다.
- 금액
  - 정수 원 단위로 계산한다. 비율은 정수 연산으로 구한다(예: `Math.floor(amount * 80 / 100)`). 1원 미만은 버린다.
  - 표시는 `toLocaleString('ko-KR') + '원'`이다.
  - 입력값에 소수점이나 음수 기호가 있으면 조용히 지우지 않고 거부한다(F2-AC-11).
- 계산 기준값은 출처 주석과 함께 `src/lib/fineRules.ts` 한 곳에 상수로 둔다.
  ```ts
  export const FINE_RULES = {
    DISCOUNT_PERCENT: 20,              // 질서위반행위규제법 제18조, 시행령 제5조 (100분의 20 범위 이내)
    SURCHARGE_PERCENT: 3,              // 질서위반행위규제법 제24조 제1항
    HEAVY_SURCHARGE_PERMILLE: 12,      // 질서위반행위규제법 제24조 제2항 (매 1개월 1천분의 12)
    HEAVY_SURCHARGE_MAX_MONTHS: 60,    // 질서위반행위규제법 제24조 제2항
  } as const;
  export const PENALTY_RULES = {
    FIRST_PERIOD_DAYS: 10,             // 도로교통법 제164조 제1항 (첫날 불산입: 민법 제157조)
    SECOND_PERIOD_DAYS: 20,            // 도로교통법 제164조 제2항
    SECOND_SURCHARGE_PERCENT: 20,      // 도로교통법 제164조 제2항
  } as const;
  /** 법정 기준이 아닌 앱 입력 오류 방지용 제한 (Assumptions 참조) */
  export const INPUT_LIMITS = {
    AMOUNT_MIN: 1_000,
    AMOUNT_MAX: 10_000_000,
    NAME_MAX_CHARS: 20,                // 코드포인트 기준 (Array.from)
    RECEIVED_MAX_YEARS_AGO: 5,
    DEADLINE_MAX_YEARS_AFTER_RECEIVED: 1,
    MAX_NOTICES: 50,
  } as const;
  ```
- 고지서 우선 원칙
  - 고지서에 적힌 감경 금액과 기한을 입력하면 앱이 계산한 값보다 그 값을 먼저 쓴다.
  - 결과 화면 하단에는 다음 고정 문구를 표시한다: "법령의 일반 기준으로 계산한 참고값이에요. 고지서에 적힌 금액과 기한이 우선이에요."
- 오류 처리
  - 저장소 함수는 throw하지 않는다. 실패는 반환값의 `error`로 알린다.
    - `'quota'`: 용량 초과
    - `'unavailable'`: 저장소 접근 불가와 그 밖의 예외
    - `'limit'`: 50장 초과
    - `'not_found'`: 없는 id
    - `'unbacked'`: 백업하지 못한 손상 데이터가 있음
    - `'newer_version'`: 저장된 데이터의 스키마 버전이 이 앱보다 높음. 모든 쓰기를 막는다
    - `'invalid'`: 쓰려는 결과가 로드 검증 규칙을 통과하지 못함. 아무것도 쓰지 않는다
  - 용량 초과 판정: 잡은 예외가 `DOMException`이고, `name`이 `'QuotaExceededError'` 또는 `'NS_ERROR_DOM_QUOTA_REACHED'`이거나 `code`가 22 또는 1014일 때만 `'quota'`다. 그 밖의 모든 예외(`SecurityError` 등)는 `'unavailable'`이다.
  - 앱이 처리한 오류에는 `console.error`를 쓰지 않는다. 사용자에게는 Toast, 필드 에러 문구, 빈 상태 화면 중 하나로만 알린다.
- 수익화
  - 결과 화면의 월별 가산금 시나리오(더 깊은 층)만 `TossRewardAd`로 잠근다.
  - 배너 `AdSlot`은 홈 목록 아래와 결과 화면 최하단에만 둔다.
  - IAP(`TossPurchase`)와 프로모션(`grantPromotionReward`)은 쓰지 않는다.
- 생성형 AI는 쓰지 않으므로 AI 고지 의무는 해당하지 않는다.
- 푸시 알림(PRD 기능 5)은 MVP에서 뺀다. 서버가 없고 토스 푸시 연동 조건이 확인되지 않았기 때문이다. 대신 홈의 "마감 임박" 배지로 대체한다(Open Questions 참조).
- 계측
  - 전환 버튼에는 `logClick`, 결과 카드와 잠금 층에는 `logImpression`을 단다.
  - 화면 진입과 체류 로그는 PageShell이 자동으로 남기므로 따로 쓰지 않는다.
  - 외부 분석 SDK(GA, Amplitude 등)는 금지한다.

## Data Models

### Notice — 등록한 고지서 1장
```ts
/** 법정 구분이라 닫힌 집합 예외: 과태료(질서위반행위규제법) | 범칙금(도로교통법 통고처분) */
export type NoticeKind = 'fine' | 'penalty';

/** 앱 내부 처리 상태 */
export type NoticeStatus = 'open' | 'paid_early' | 'paid_late' | 'objected';

export interface Notice {
  id: string;                       // `${Date.now()}-${Math.random().toString(36).slice(2,8)}` (crypto.randomUUID 미사용: Android 7 WebView 호환)
  name: string;                     // 사용자가 붙인 이름, trim된 값으로 저장, 1~20자(코드포인트 기준, Array.from). 예: "강남 주정차"
  kind: NoticeKind;
  amount: number;                   // 감경 전 원래 금액(원), 정수, 1,000 ≤ amount ≤ 10,000,000
  discountedAmount: number | null;  // 고지서에 적힌 감경 금액(과태료만). 있으면 계산값 대신 사용. 정수, 1 ≤ v < amount
  receivedDate: string;             // 'YYYY-MM-DD' (입력 시 (오늘 − 5년) 이상 오늘 이하. 로드 검증에는 쓰지 않음)
  opinionDeadline: string | null;   // 과태료: 의견제출 기한 = 감경 마감. 범칙금: 항상 null
  paymentDeadline: string | null;   // 과태료: 본 고지서 납부기한. 범칙금: 1차 납부기한(비우면 receivedDate + 10일)
  status: NoticeStatus;             // 기본 'open'
  paidAmount: number | null;        // status가 paid_early·paid_late일 때 기록한 납부액
  savedAmount: number;              // paid_early 기록 시점의 potentialSaving 값, 그 외 0
  decidedAt: string | null;         // 상태 기록 날짜 'YYYY-MM-DD'. open이면 null
  createdAt: string;                // new Date().toISOString() (타임스탬프 쓰기 규칙 참조)
  updatedAt: string;                // new Date().toISOString() (타임스탬프 쓰기 규칙 참조)
}

/** 입력 폼 → 저장 함수로 넘기는 값 */
export type NoticeInput = Pick<Notice,
  'name' | 'kind' | 'amount' | 'discountedAmount' | 'receivedDate' | 'opinionDeadline' | 'paymentDeadline'>;
```
- 제약: 아래 "로드 검증 규칙"의 불변식과 같다. 입력 화면은 여기에 오늘 기준 규칙(받은 날 ≤ 오늘, 5년 하한)을 더 적용한다(F2-AC-3·4·13).
- 최대 개수: 50장.

### 저장소
```ts
// src/lib/noticeSchema.ts
export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_LIMITS = { MAX_CORRUPT_BACKUPS: 3 } as const; // 법정 기준 아님, 앱 저장 용량 제한

export interface NoticesData { version: 1; notices: Notice[] }          // fdc:notices:v1
export interface CorruptBackup { version: 1; backups: { raw: string }[] } // fdc:notices:corrupt, 오래된 순
export type NoticeMigrations = Record<number, (data: unknown) => unknown>; // key n: vn → vn+1
export const MIGRATIONS: NoticeMigrations = {};                           // MVP는 비어 있음
```

| localStorage 키 | 형태 | 용도 |
|---|---|---|
| `fdc:notices:v1` | `NoticesData` | 고지서 전체 |
| `fdc:notices:corrupt` | `CorruptBackup` (backups 최대 3개) | 손상 데이터 원문 백업. 기존 항목은 덮어쓰거나 지우지 않는다 |

- 용량 추정
  - Notice 1건은 약 450B다. 50건이면 약 22.5KB다.
  - 백업 항목은 손상 원문과 크기가 같다. 원문 크기에는 상한이 없다. 쓰기에 실패하면 `backupFailed: true`로 처리한다(F1-AC-9).
  - 정상 데이터로 만든 원문이면 3개를 합쳐도 약 70KB 이하다(5MB 한도의 2% 미만).
- 리뷰 요청 1회 여부는 템플릿 `requestReviewOnce`가 자체 관리하므로 별도 키를 만들지 않는다.
- 리워드 광고 잠금 해제 여부는 저장하지 않는다. 결과 화면에 진입할 때마다 게이트가 새로 걸린다.

#### 스키마 버전 정책 (`fdc:notices:v1`)
- 키 이름은 바꾸지 않는다. 스키마가 v2가 되어도 같은 키에 `version: 2`로 쓴다.
  - 이유: 키를 바꾸면 이전 버전 번들이 빈 키를 보고 새 데이터를 만들어, 데이터가 두 갈래로 나뉜다.
- `version` 판정은 `loadNotices`·`saveNotice`·`updateStatus`·`deleteNotice`가 모두 같은 규칙을 쓴다.
  - 없음, 정수 아님(`'1'`, `1.5`), 1 미만 → 손상
  - `1 ≤ version < CURRENT_SCHEMA_VERSION` → `migrateNoticesData`로 한 단계씩 변환한 뒤 검증한다
    - 변환 단계가 없거나 변환 중 예외가 나거나 검증에 실패하면 손상으로 본다
    - 변환 결과는 `loadNotices`가 쓰지 않는다. 다음 쓰기 때 `CURRENT_SCHEMA_VERSION`으로 저장된다
    - MVP는 `CURRENT_SCHEMA_VERSION = 1`이라 이 경로를 타는 데이터가 없다
  - `version === CURRENT_SCHEMA_VERSION` → 검증한다
  - `version > CURRENT_SCHEMA_VERSION` → 새 버전 데이터다. 손상이 아니므로 백업하지 않는다. 모든 쓰기를 `'newer_version'`으로 막아 덮어쓰지 않는다(F1-AC-19)
- v2를 도입할 때 할 일
  - `CURRENT_SCHEMA_VERSION`을 2로 올린다.
  - `MIGRATIONS[1]`(v1 → v2)을 추가한다.
  - `validateNotices`와 이 절을 갱신한다.

#### 로드 검증 규칙 (`validateNotices(data): Notice[] | null`)
하나라도 어기면 `null`이고, 데이터 전체를 손상으로 본다(F1-AC-9). 오늘 날짜에 따라 결과가 바뀌는 규칙(받은 날 ≤ 오늘, 받은 날 ≥ 오늘 − 5년)은 쓰지 않는다. 그런 규칙을 넣으면 시간이 지나기만 해도 정상 데이터가 손상으로 바뀌기 때문이다.

- 컬렉션
  - 최상위 값이 객체이고 `notices`가 배열이다.
  - `notices.length ≤ 50`
  - `id`가 중복되지 않는다.
- 항목 형식
  - `id`: 빈 문자열이 아닌 문자열
  - `name`: 문자열이고, `name === name.trim()`이며, `countChars(name)`이 1~20이다
  - `kind` ∈ NoticeKind, `status` ∈ NoticeStatus
  - `amount`: 정수, 1,000 ≤ amount ≤ 10,000,000
  - `discountedAmount`: null 또는 정수이고, 정수면 1 ≤ v < amount
  - `receivedDate`: `isValidYmd`가 true다
  - `opinionDeadline`·`paymentDeadline`·`decidedAt`: null이거나, `isValidYmd`가 true인 문자열이다
  - `paidAmount`: null 또는 정수
  - `savedAmount`: 정수 ≥ 0
  - `createdAt`·`updatedAt`: `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/`에 맞고 `Date.parse` 결과가 NaN이 아니다
- 항목 불변식
  - 과태료(`'fine'`)는 `opinionDeadline`과 `paymentDeadline` 중 하나 이상이 null이 아니다
  - 범칙금(`'penalty'`)은 `opinionDeadline === null`, `discountedAmount === null`이고, status가 `'objected'`가 아니다
  - 두 기한 모두 `receivedDate` 이상이고 `addYears(receivedDate, 1)` 이하다(값이 있을 때만)
  - 두 기한이 모두 있으면 `opinionDeadline ≤ paymentDeadline`이다
  - 상태별 기록값:

| status | paidAmount | savedAmount | decidedAt |
|---|---|---|---|
| `open` | null | 0 | null |
| `paid_early` | 정수 ≥ 1 | 정수 ≥ 0 | 날짜 |
| `paid_late` | 정수 ≥ 1 | 0 | 날짜 |
| `objected` | null | 0 | 날짜 |

- 쓰기 규칙: `saveNotice`·`updateStatus`·`deleteNotice`는 쓰기 직전의 전체 목록을 `validateNotices`로 확인한다. 실패하면 아무것도 쓰지 않고 `{ ok: false, error: 'invalid' }`를 반환한다. 그래서 앱이 쓴 데이터가 다음 로드에서 손상으로 판정되는 일이 없다.

#### 타임스탬프 쓰기 규칙 (`createdAt`·`updatedAt`)
- `saveNotice` 신규(id 없음): `createdAt = updatedAt = new Date().toISOString()`
- `saveNotice` 수정(id 있음): `createdAt`은 그대로 두고 `updatedAt = new Date().toISOString()`. 값이 바뀌지 않은 저장이어도 갱신한다
- `updateStatus` 성공: 대상 고지서의 `updatedAt = new Date().toISOString()`. `createdAt`은 그대로 둔다
- `deleteNotice`: 남은 고지서의 `createdAt`·`updatedAt`을 바꾸지 않는다
- 실패한 쓰기(`ok: false`)에서는 어떤 타임스탬프도 바뀌지 않는다
- 사용처: `createdAt`은 홈 정렬에서 dday가 같을 때 쓴다(F5-AC-3). `updatedAt`은 화면에 표시하지 않고, 이후 마이그레이션과 오류 조사 때 기준값으로 쓴다

#### 백업 키 규칙 (`fdc:notices:corrupt`)
- 쓰기 전용 키다. 읽는 곳은 두 함수뿐이다.
  - `loadNotices`: 중복을 확인하고 항목을 추가할 때 읽는다
  - `saveNotice`: 손상 원문이 백업됐는지 판정할 때 읽는다(F1-AC-13)
- 화면에서 백업을 보여 주거나 복원하는 기능은 없다(Open Questions 9).
- 쓰는 함수는 `loadNotices` 하나다. 이 키의 항목을 지우거나 덮어쓰는 함수는 없다.
- 기존 값 해석(`parseCorruptBackup(raw): { kind: 'ok'; backups: { raw: string }[] } | { kind: 'newer' }`)
  - 키가 없으면 → 빈 목록
  - `{ version: 1, backups: [{ raw: string }…] }` 형식이고 항목이 3개 이하면 → 그 목록
  - JSON 객체이고 `version`이 1보다 큰 정수면 → `'newer'`(쓰지 않음)
  - 그 밖의 값(맨 문자열, 형식이 다른 JSON 등) → 그 문자열 전체를 항목 1개 `[{ raw: 기존값 }]`로 본다. 버리지 않는다
- 추가 규칙(`loadNotices`가 손상을 감지했을 때)
  - 원문과 같은 `raw`가 이미 있으면 쓰지 않는다. `backupFailed: false`
  - 항목이 3개 미만이면 맨 뒤에 `{ raw: 원문 }`을 추가해 `{ version: 1, backups }`로 쓴다. 쓰기 예외가 나면 `backupFailed: true`
  - 항목이 3개이거나 해석 결과가 `'newer'`이면 쓰지 않는다. `backupFailed: true`

### 계산 결과 타입 (저장하지 않는 파생값)
```ts
export interface KeyDeadline {
  date: string;                     // 'YYYY-MM-DD'
  label: '감경 마감' | '납부기한' | '1차 납부기한' | '2차 납부기한';
  dday: number;                     // date - today (일)
}
export interface FineComparison {
  discounted: number;   // 감경 납부액 (discountedAmount ?? floor(amount*80/100))
  full: number;         // 감경 기한 후 납부액 = amount
  overdueFirst: number; // 납부기한 다음 날부터 = amount + floor(amount*3/100)
  saving: number;       // full - discounted
}
export interface FineScenarioRow { month: number; total: number; surcharge: number; } // month 0 = 납부기한 다음 날
export interface PenaltyStages {
  firstDeadline: string;  firstAmount: number;   // 1차 기한, 원래 금액
  secondDeadline: string; secondAmount: number;  // 1차 + 20일, amount + floor(amount*20/100)
}
export interface LoadResult {
  notices: Notice[];
  corrupted: boolean;     // 원문이 있었지만 파싱·버전·검증에 실패함
  backupFailed: boolean;  // corrupted이고 원문을 fdc:notices:corrupt에 남기지 못함
  unavailable: boolean;   // localStorage 접근 자체가 예외를 던짐
  newerVersion: boolean;  // 저장된 version > CURRENT_SCHEMA_VERSION (손상 아님)
}
// 판정 우선순위: unavailable → newerVersion → corrupted. 하나가 true면 나머지는 false(backupFailed는 corrupted일 때만 true 가능)
export type AmountParse =
  | { kind: 'ok'; digits: string }                      // 숫자만 남긴 문자열('' 가능)
  | { kind: 'reject'; reason: 'negative' | 'decimal' };
```

## Feature List

### F1. 감경·가산금 계산 엔진 & 고지서 저장소 (데이터 계층)
- Description: 이 기능은 UI 없이 네 모듈로 구성한다. 모든 화면이 이 모듈만 호출한다.
  - `src/lib/fineEngine.ts`: 순수 계산 함수다. 법령 기준 상수(`fineRules.ts`)로 감경 납부액, 가산금·중가산금 시나리오, 범칙금 1·2차 금액, D-day를 계산한다.
  - `src/lib/noticeSchema.ts`: 순수 함수다. 스키마 버전, 검증, 마이그레이션, 백업 해석을 맡는다.
  - `src/lib/noticeStore.ts`: localStorage 읽기·쓰기를 맡는다.
  - `src/lib/inputRules.ts`: 순수 입력 해석 함수다.
- Data: Notice, `fdc:notices:v1`, `fdc:notices:corrupt`
- API: 없음 (외부 호출 없음)
- 함수
  - `calcDday(date, today): number`
  - `getKeyDeadline(n, today): KeyDeadline | null` — 오늘 이후(당일 포함) 기한 중 가장 이른 기한을 돌려준다. 모든 기한이 지나면 `null`이다. status가 `'objected'`이면 감경 마감은 건너뛰고 납부기한만 본다
  - `getLastDeadline(n, today): KeyDeadline` — 그 고지서의 마지막 기한을 돌려준다. 과태료는 `paymentDeadline ?? opinionDeadline`이고 라벨은 `'납부기한'` 또는 `'감경 마감'`이다. 범칙금은 2차 납부기한이다. 로드 검증에서 과태료는 기한이 하나 이상 있다고 보장하므로 null이 나오지 않는다. dday는 음수일 수 있다. `getKeyDeadline`이 `null`일 때 D+n 표시와 정렬에 쓴다
  - `calcFineComparison(n): FineComparison`
  - `calcFineScenario(amount, maxMonth=60): FineScenarioRow[]`
  - `calcPenaltyStages(n): PenaltyStages`
  - `currentDueAmount(n, today): number`
  - `potentialSaving(n, today): number`
  - (`noticeSchema.ts`) `validateNotices(data): Notice[] | null` — "로드 검증 규칙" 전체를 적용한다
  - (`noticeSchema.ts`) `migrateNoticesData(data, fromVersion, migrations = MIGRATIONS, toVersion = CURRENT_SCHEMA_VERSION): unknown | null` — 단계가 없거나 예외가 나면 throw하지 않고 null을 돌려준다
  - (`noticeSchema.ts`) `parseCorruptBackup(raw: string | null)` — "백업 키 규칙"의 해석을 따른다
  - `loadNotices(): LoadResult`
  - `saveNotice(input, id?, opts?: { resetRecord?: boolean; discardCorrupt?: boolean }): { ok: true; notice: Notice } | { ok: false; error: 'quota' | 'limit' | 'unavailable' | 'unbacked' | 'newer_version' | 'invalid' }`
    - id가 있으면 기존 status·paidAmount·savedAmount·decidedAt·createdAt을 그대로 둔다.
    - `resetRecord: true`이면 기록값을 `'open'`·null·0·null로 초기화한다.
    - `discardCorrupt: true`이면 백업하지 못한 손상 원문을 덮어쓰는 것을 허용한다(F1-AC-13). `'newer_version'`은 이 옵션으로도 풀리지 않는다.
    - 판정 순서: 읽기 예외(`'unavailable'`) → 새 버전(`'newer_version'`) → 백업 안 된 손상(`'unbacked'`) → 50장(`'limit'`) → 검증(`'invalid'`) → 쓰기 예외(`'quota'`/`'unavailable'`)
  - `updateStatus(id, status, today): { ok: true; notice: Notice } | { ok: false; error: 'quota' | 'not_found' | 'unavailable' | 'newer_version' | 'invalid' }`
  - `deleteNotice(id): { ok: true } | { ok: false; error: 'quota' | 'not_found' | 'unavailable' | 'newer_version' }`
  - (`inputRules.ts`) `parseAmountInput(raw): AmountParse`
  - (`inputRules.ts`) `countChars(s): number` — `Array.from(s.trim()).length`
  - (`inputRules.ts`) `addYears(date, n): string` — 같은 월·일을 쓰고, 그 날이 없으면 그 달 말일을 쓴다
  - (`inputRules.ts`) `isValidYmd(s): boolean` — `/^\d{4}-\d{2}-\d{2}$/`에 맞고, 월이 1~12이며, 일이 그 달에 실제로 있는 날(윤년 반영)이면 true
- Requirements:
- AC-1 [U][P0]: Scenario: 과태료 감경·체납 비교 계산
  - Given `{ kind: 'fine', amount: 40000, discountedAmount: null }`
  - When `calcFineComparison` 호출
  - Then `{ discounted: 32000, full: 40000, overdueFirst: 41200, saving: 8000 }`을 반환한다
  - And `{ amount: 33333 }`이면 `discounted: 26666, overdueFirst: 34332`(각 항 1원 미만 버림)
- AC-2 [U][P0]: Scenario: 고지서 감경 금액 우선
  - Given `{ kind: 'fine', amount: 40000, discountedAmount: 30000 }`
  - When `calcFineComparison` 호출
  - Then `{ discounted: 30000, full: 40000, overdueFirst: 41200, saving: 10000 }`을 반환한다
- AC-3 [U][P0]: Scenario: 가산금·중가산금 월별 시나리오와 60개월 상한
  - Given `amount: 40000`
  - When `calcFineScenario(40000, 61)` 호출
  - Then month 0 → total 41200(surcharge 1200)
  - And month 1 → 41680, month 12 → 46960, month 60 → 70000(surcharge 30000)
  - And month 61 → 70000(60개월 초과분은 가산하지 않음)
- AC-4 [U][P0]: Scenario: 범칙금 1·2차 기한과 금액
  - Given `{ kind: 'penalty', amount: 40000, receivedDate: '2026-10-05', paymentDeadline: null }`
  - When `calcPenaltyStages` 호출
  - Then `{ firstDeadline: '2026-10-15', firstAmount: 40000, secondDeadline: '2026-11-04', secondAmount: 48000 }`
  - And paymentDeadline이 `'2026-10-16'`이면 firstDeadline은 `'2026-10-16'`, secondDeadline은 `'2026-11-05'`
- AC-5 [U][P0]: Scenario: D-day와 기준 기한 전환
  - Given today `'2026-10-09'`
  - When `calcDday('2026-10-20', today)` → 11, `calcDday('2026-10-09', today)` → 0, `calcDday('2026-10-08', today)` → −1
  - Then 과태료 `{ opinionDeadline: '2026-10-20', paymentDeadline: '2026-11-30' }`의 `getKeyDeadline`은 today `'2026-10-20'`에서 `{ label: '감경 마감', dday: 0 }`을 반환한다
  - And today `'2026-10-21'`에서는 `{ label: '납부기한', date: '2026-11-30', dday: 40 }`을 반환한다
- AC-6 [U][P0]: Scenario: 지금 낼 금액과 아낄 수 있는 금액
  - Given today `'2026-10-09'`
  - When 과태료 `{ amount: 40000, opinionDeadline: '2026-10-20' }`
  - Then `currentDueAmount = 32000`, `potentialSaving = 8000`
  - And 감경 마감이 지나고 납부기한 전이면 `currentDueAmount = 40000`, `potentialSaving = 1200`
  - And 범칙금 `{ amount: 60000 }` 1차 기한 전이면 `currentDueAmount = 60000`, `potentialSaving = 12000`
  - And 1차 기한 후 2차 기한 전이면 `currentDueAmount = 72000`, `potentialSaving = 0`
- AC-7 [E][P0]: Scenario: 저장·불러오기·빈 저장소
  - Given `fdc:notices:v1` 키가 없을 때
  - When `loadNotices()` 호출
  - Then `{ notices: [], corrupted: false, backupFailed: false, unavailable: false, newerVersion: false }`을 반환한다
  - And `saveNotice({ name: '강남 주정차', kind: 'fine', amount: 40000, ... })` 후 `loadNotices().notices[0]`의 name이 `'강남 주정차'`, status가 `'open'`, savedAmount가 0이다
  - And 저장된 원문은 `{"version":1,"notices":[…]}`이다
- AC-8 [W][P1]: Scenario: 손상 데이터와 저장 공간 부족
  - Given `fdc:notices:v1` 값이 `'{bad'`이고 `fdc:notices:corrupt` 키가 없을 때
  - When `loadNotices()` 호출
  - Then `{ notices: [], corrupted: true, backupFailed: false, unavailable: false, newerVersion: false }`를 반환한다
  - And `fdc:notices:corrupt`는 `{"version":1,"backups":[{"raw":"{bad"}]}`가 된다
  - And `fdc:notices:corrupt`의 backups에 이미 같은 원문이 있으면 다시 쓰지 않고 `backupFailed: false`를 반환한다
  - And `localStorage.setItem`이 `QuotaExceededError`를 던지면 `saveNotice`는 throw하지 않고 `{ ok: false, error: 'quota' }`를 반환한다. 기존 데이터는 바뀌지 않는다
  - And 50장이 저장된 상태에서 새 저장 시 `{ ok: false, error: 'limit' }`를 반환한다
  - And `saveNotice`·`updateStatus`·`deleteNotice`는 `fdc:notices:corrupt` 키를 쓰거나 지우지 않는다. 이 키에 쓰는 함수는 `loadNotices`뿐이다
- AC-9 [W][P1]: Scenario: JSON은 유효하지만 스키마가 틀린 데이터
  - Given `fdc:notices:v1` 값이 다음 중 하나일 때
    - `'{"version":0,"notices":[]}'`
    - `'{"version":"1","notices":[]}'`
    - `'{"version":1.5,"notices":[]}'`
    - `'{"notices":[]}'`(version 없음)
    - `'{"version":1,"notices":{}}'`
    - `'[]'`(최상위가 배열)
    - notices 항목 하나에 `amount`가 없는 JSON
  - When `loadNotices()` 호출
  - Then 파싱 실패와 똑같이 `{ notices: [], corrupted: true, backupFailed: false, unavailable: false, newerVersion: false }`를 반환하고 원문을 `fdc:notices:corrupt`의 backups에 추가한다(F1-AC-21)
  - And 검증 기준은 Data Models의 "로드 검증 규칙" 전체(형식, 불변식, 컬렉션)다. 하나라도 틀린 항목이 있으면 전체를 손상으로 본다
  - And `fdc:notices:corrupt` 쓰기가 예외(`QuotaExceededError` 포함)를 던져도 `loadNotices`는 throw하지 않는다. 반환값은 `{ notices: [], corrupted: true, backupFailed: true, unavailable: false, newerVersion: false }`다
  - And version이 2 이상의 정수인 경우는 손상이 아니라 F1-AC-19를 따른다
- AC-10 [W][P1]: Scenario: 상태 기록·삭제 실패와 기록값 규칙
  - Given `localStorage.setItem`이 `QuotaExceededError`를 던질 때
  - When `updateStatus(id, 'paid_early', today)` 또는 `deleteNotice(id)` 호출
  - Then 둘 다 throw하지 않고 `{ ok: false, error: 'quota' }`를 반환한다. 저장된 데이터는 바뀌지 않는다
  - And 존재하지 않는 id면 둘 다 `{ ok: false, error: 'not_found' }`를 반환한다
  - And 성공 시 `updateStatus`는 기록 직전 값(status를 `'open'`으로 보고 계산한 값)으로 다음을 저장한다
    - `paid_early`: paidAmount = `currentDueAmount`, savedAmount = `potentialSaving`
    - `paid_late`: paidAmount = `currentDueAmount`, savedAmount 0
    - `objected`: paidAmount null, savedAmount 0
    - `open`: paidAmount null, savedAmount 0, decidedAt null
  - And `open`이 아닌 상태는 decidedAt = today로 저장한다
  - And 범칙금에 `updateStatus(id, 'objected', today)`를 호출하면 불변식 위반이므로 `{ ok: false, error: 'invalid' }`를 반환하고 아무것도 쓰지 않는다
- AC-11 [W][P1]: Scenario: 모든 기한이 지난 고지서와 비-open 상태
  - Given today `'2026-12-01'`, 과태료 `{ amount: 40000, opinionDeadline: '2026-10-20', paymentDeadline: '2026-11-30' }`
  - Then `getKeyDeadline`은 `null`이다
  - And `getLastDeadline`은 `{ label: '납부기한', date: '2026-11-30', dday: -1 }`이다
  - And `currentDueAmount = 41200`, `potentialSaving = 0`이다. 중가산금은 날짜 경계를 확인하기 전이라 반영하지 않는다(Open Questions 1)
  - And 과태료 `{ amount: 40000, opinionDeadline: '2026-10-20', paymentDeadline: null }`, today `'2026-10-21'`이면 다음과 같다
    - `getKeyDeadline`은 `null`이다
    - `getLastDeadline`은 `{ label: '감경 마감', date: '2026-10-20', dday: -1 }`이다
    - `currentDueAmount = 40000`, `potentialSaving = 0`이다
  - And 범칙금 `{ amount: 40000, receivedDate: '2026-10-05', paymentDeadline: null }`, today `'2026-11-05'`이면 다음과 같다
    - `getKeyDeadline`은 `null`이다
    - `getLastDeadline`은 `{ label: '2차 납부기한', date: '2026-11-04', dday: -1 }`이다
    - `currentDueAmount = 48000`, `potentialSaving = 0`이다
  - And status가 `'paid_early'`·`'paid_late'`이면 `currentDueAmount = paidAmount`다
  - And `'objected'`이면 감경 단계를 건너뛰고 open과 같은 규칙을 쓴다(납부기한 전 amount, 납부기한 후 amount + 3%)
  - And `open`이 아닌 상태의 `potentialSaving`은 항상 0이다
- AC-12 [W][P1]: Scenario: 저장소 접근 자체가 실패함 (quota 외 예외)
  - Given `window.localStorage` 접근이나 `localStorage.getItem`이 `SecurityError`(예: 사생활 보호 모드, WebView 정책)를 던질 때
  - When `loadNotices()` 호출
  - Then throw하지 않고 `{ notices: [], corrupted: false, backupFailed: false, unavailable: true, newerVersion: false }`를 반환한다
  - And `fdc:notices:corrupt` 쓰기를 시도하지 않는다
  - And `localStorage.setItem`이 `SecurityError`나 그 밖의 비-quota 예외를 던지면 다음 함수가 throw하지 않고 `{ ok: false, error: 'unavailable' }`를 반환한다
    - `saveNotice`
    - `updateStatus`
    - `deleteNotice`
  - And 예외가 `DOMException`이고 code 22 또는 1014이거나 name `'NS_ERROR_DOM_QUOTA_REACHED'`이면 `'quota'`로 분류한다
  - And 위 모든 경우 `console.error` 호출은 0회다
- AC-13 [W][P0]: Scenario: 백업하지 못한 손상 데이터는 조용히 덮어쓰지 않는다
  - Given `fdc:notices:v1` 값이 `'{bad'`이고 `fdc:notices:corrupt` 키가 없을 때(F1-AC-9의 백업 실패 이후)
  - When `saveNotice(input)` 호출
  - Then `{ ok: false, error: 'unbacked' }`를 반환하고 `fdc:notices:v1`은 `'{bad'` 그대로다
  - And `saveNotice(input, undefined, { discardCorrupt: true })`를 호출하면 `{ ok: true }`를 반환하고 `fdc:notices:v1`이 `{ version: 1, notices: [새 고지서 1건] }`이 된다
  - And `fdc:notices:corrupt`의 backups에 원문 `'{bad'`가 없을 때도 `'unbacked'`를 반환한다. 예: `[{ raw: '{older' }]`만 있거나 해석 결과가 `'newer'`인 경우
  - And backups에 원문 `'{bad'`와 같은 `raw`가 있으면(백업 성공) `discardCorrupt` 없이 바로 저장한다(F2-AC-10과 같음)
  - And `saveNotice`는 백업 여부만 읽어서 판정한다. `fdc:notices:corrupt`에 쓰지 않는다
  - And `fdc:notices:v1`이 비어 있거나 유효하면 `'unbacked'`는 반환되지 않는다
- AC-14 [U][P0]: Scenario: 입력 해석 순수 함수
  - Given `parseAmountInput`에 다음 값을 넣을 때
  - Then 다음과 같이 반환한다
    - `'40,000원'` → `{ kind: 'ok', digits: '40000' }`
    - `'4만원'` → `{ kind: 'ok', digits: '4' }`
    - `'@#$%'` → `{ kind: 'ok', digits: '' }`
    - `'40000.5'` → `{ kind: 'reject', reason: 'decimal' }`
    - `'40.000'` → `{ kind: 'reject', reason: 'decimal' }`
    - `'-5000'` → `{ kind: 'reject', reason: 'negative' }`
    - `'−5000'`(U+2212) → `{ kind: 'reject', reason: 'negative' }`
    - `'－5000'`(U+FF0D) → `{ kind: 'reject', reason: 'negative' }`
    - `'-40000.5'` → `{ kind: 'reject', reason: 'negative' }` (음수 판정이 소수점 판정보다 먼저)
  - And `'．'`(U+FF0E)도 `'.'`과 같이 `'decimal'`이다
  - And `countChars` 결과는 다음과 같다
    - `'🚗'.repeat(20)` → 20 (`'🚗'.length`는 2이지만 1자로 센다)
    - `'🚗'.repeat(21)` → 21
    - `'  강남 주정차  '` → 6
  - And `addYears` 결과는 다음과 같다
    - `addYears('2026-10-09', -5)` → `'2021-10-09'`
    - `addYears('2028-02-29', 1)` → `'2029-02-28'`
    - `addYears('2026-10-05', 1)` → `'2027-10-05'`
- AC-15 [U][P0]: Scenario: 불변식 위반 데이터는 손상으로 처리
  - Given 유효한 기준 항목 B = `{ id: 'a1', name: '강남 주정차', kind: 'fine', amount: 40000, discountedAmount: null, receivedDate: '2026-10-05', opinionDeadline: '2026-10-20', paymentDeadline: '2026-11-30', status: 'open', paidAmount: null, savedAmount: 0, decidedAt: null, createdAt: '2026-10-09T01:00:00.000Z', updatedAt: '2026-10-09T01:00:00.000Z' }`
  - When `{ version: 1, notices: [B] }`로 `loadNotices()` 호출
  - Then `notices`는 B 1건이고 `corrupted: false`다
  - And B에서 다음 중 하나만 바꾼 데이터는 `validateNotices`가 null을 반환하고, `loadNotices`는 `corrupted: true`와 함께 원문을 백업한다
    - 기한: opinionDeadline·paymentDeadline 둘 다 null
    - 기한: opinionDeadline `'2026-11-30'`, paymentDeadline `'2026-11-01'`(역전)
    - 기한: opinionDeadline `'2026-10-01'`(받은 날 이전)
    - 기한: paymentDeadline `'2027-10-06'`(`addYears(receivedDate, 1)` 초과)
    - 범칙금: kind `'penalty'`에 opinionDeadline `'2026-10-20'`
    - 범칙금: kind `'penalty'`, opinionDeadline null에 discountedAmount 30000
    - 범칙금: kind `'penalty'`, opinionDeadline null에 status `'objected'`
    - 상태: status `'open'`에 decidedAt `'2026-10-09'`
    - 상태: status `'open'`에 paidAmount 32000 또는 savedAmount 8000
    - 상태: status `'paid_early'`에 decidedAt null 또는 paidAmount null
    - 상태: status `'paid_late'`에 savedAmount 1200
    - 상태: status `'objected'`에 paidAmount 40000
    - 금액: amount 999, 10000001, 40000.5
    - 감경 금액: discountedAmount 40000(= amount), 0
    - 금액: savedAmount −1
    - 이름: name `''`, `'   '`, `' 강남'`(trim과 다름), `'🚗'.repeat(21)`
    - id: `''`
  - And B의 receivedDate `'2019-03-02'`, opinionDeadline `'2019-03-20'`, paymentDeadline `'2019-04-10'`이고 today가 `'2026-10-09'`이면 손상이 아니다(5년 하한은 입력 규칙이고 로드 검증에는 쓰지 않음)
  - And `saveNotice`에 이 불변식을 어기는 input(예: kind `'fine'`, 두 기한 모두 null)을 넘기면 `{ ok: false, error: 'invalid' }`를 반환하고 `fdc:notices:v1`은 바뀌지 않는다
- AC-16 [U][P0]: Scenario: 날짜 형식과 달력 검증
  - Given `isValidYmd`에 다음 값을 넣을 때
  - Then 다음과 같이 반환한다
    - `'2028-02-29'` → true, `'2026-12-31'` → true
    - `'2026-02-29'` → false, `'2026-02-30'` → false, `'2026-04-31'` → false
    - `'2026-00-10'` → false, `'2026-13-01'` → false
    - `'2026-2-03'` → false, `'abc'` → false, `''` → false
    - `'2026-10-09T00:00:00Z'` → false
  - And F1-AC-15의 B에서 다음 중 하나만 바꾸면 `loadNotices`는 `corrupted: true`다
    - receivedDate `'2026-02-30'` 또는 `'abc'`
    - opinionDeadline `'2026-13-01'`
    - paymentDeadline `'2026/11/30'`
    - status `'objected'`, decidedAt `'2026-02-29'`
    - createdAt `'yesterday'`
    - updatedAt `'2026-10-09'`(시각 없음)
  - And 이 경우 `calcDday`는 호출되지 않아 화면에 NaN이 표시되지 않는다
- AC-17 [W][P1]: Scenario: 개수 초과와 중복 id
  - Given F1-AC-15 기준으로 서로 다른 id를 가진 유효 항목 51개가 저장돼 있을 때
  - When `loadNotices()` 호출
  - Then `corrupted: true`이고 `notices`는 `[]`다
  - And 유효 항목이 정확히 50개면 50건을 그대로 반환한다
  - And id가 `'a1'`인 유효 항목 2개가 있으면 `corrupted: true`다
  - And 따라서 `updateStatus`·`deleteNotice`가 받는 목록에는 중복 id가 없어, 대상 id로 정확히 1건만 고른다
- AC-18 [U][P1]: Scenario: createdAt·updatedAt 쓰기 규칙
  - Given 시계가 `'2026-10-09T01:00:00.000Z'`일 때
  - When `saveNotice(input)`(신규) 호출
  - Then 저장된 고지서의 createdAt과 updatedAt이 모두 `'2026-10-09T01:00:00.000Z'`다
  - And 시계가 `'2026-10-10T02:00:00.000Z'`일 때 `saveNotice(input, id)`(수정)를 호출하면 createdAt은 `'2026-10-09T01:00:00.000Z'` 그대로이고 updatedAt은 `'2026-10-10T02:00:00.000Z'`다
  - And 시계가 `'2026-10-11T03:00:00.000Z'`일 때 `updateStatus(id, 'paid_early', '2026-10-11')`를 호출하면 updatedAt만 `'2026-10-11T03:00:00.000Z'`가 된다
  - And 고지서 2건 중 1건을 `deleteNotice`로 지우면, 남은 1건의 createdAt·updatedAt은 바뀌지 않는다
  - And `ok: false`로 끝난 호출(`'quota'`, `'invalid'` 등) 뒤에는 어떤 고지서의 타임스탬프도 바뀌지 않는다
- AC-19 [W][P0]: Scenario: 이 앱보다 새 버전의 데이터는 손상이 아니며 덮어쓰지 않는다
  - Given `CURRENT_SCHEMA_VERSION = 1`이고 `fdc:notices:v1` 값이 `'{"version":2,"notices":[{"id":"x"}]}'`일 때
  - When `loadNotices()` 호출
  - Then `{ notices: [], corrupted: false, backupFailed: false, unavailable: false, newerVersion: true }`를 반환한다
  - And `fdc:notices:corrupt`에는 쓰지 않는다
  - And 다음 호출은 모두 `{ ok: false, error: 'newer_version' }`를 반환하고 `fdc:notices:v1`은 원문 그대로다
    - `saveNotice(input)`
    - `saveNotice(input, undefined, { discardCorrupt: true })`
    - `updateStatus('x', 'open', today)`
    - `deleteNotice('x')`
  - And version이 2 이상의 정수가 아니면(0, `'2'`, 2.5, 없음) 이 규칙이 아니라 손상(F1-AC-9)으로 처리한다
- AC-20 [U][P1]: Scenario: 마이그레이션 함수
  - Given `migrations = { 1: d => ({ version: 2, notices: d.notices.map(n => ({ ...n, memo: '' })) }) }`
  - When `migrateNoticesData({ version: 1, notices: [B] }, 1, migrations, 2)` 호출
  - Then `{ version: 2, notices: [{ ...B, memo: '' }] }`를 반환한다
  - And `migrations = {}`이면 null을 반환한다(단계 없음)
  - And `migrations[1]`이 예외를 던지면 throw하지 않고 null을 반환한다
  - And fromVersion과 toVersion이 같으면 data를 그대로 반환한다
  - And 기본 인자(`MIGRATIONS = {}`, `CURRENT_SCHEMA_VERSION = 1`)로 `migrateNoticesData(data, 1)`을 호출하면 data를 그대로 반환한다
- AC-21 [W][P0]: Scenario: 손상 백업은 기존 항목을 덮어쓰지 않는다
  - Given `fdc:notices:corrupt` 값이 `{"version":1,"backups":[{"raw":"{older"}]}`이고 `fdc:notices:v1` 값이 `'{bad'`일 때
  - When `loadNotices()` 호출
  - Then `fdc:notices:corrupt`가 `{"version":1,"backups":[{"raw":"{older"},{"raw":"{bad"}]}`가 되고 `backupFailed: false`다
  - And backups가 이미 3개(`'{a'`, `'{b'`, `'{c'`)이고 원문이 `'{bad'`이면 쓰지 않는다. 3개는 그대로 남고 `backupFailed: true`다. 이후 `saveNotice(input)`은 `'unbacked'`를 반환한다(F1-AC-13)
  - And `fdc:notices:corrupt` 값이 맨 문자열 `'{older'`(백업 스키마가 아님)이면 `{"version":1,"backups":[{"raw":"{older"},{"raw":"{bad"}]}`로 쓴다. 기존 문자열은 첫 항목으로 남는다
  - And `fdc:notices:corrupt` 값이 `{"version":2,"backups":[]}`이면 쓰지 않고 `backupFailed: true`다
  - And 어떤 함수도 backups 항목을 지우거나 바꾸지 않는다

### F2. 고지서 등록·수정 화면
- Description: 고지서 이름, 유형(과태료·범칙금), 원래 금액, 고지서 표기 감경 금액, 받은 날, 의견제출 기한, 납부기한을 입력해 저장한다. 같은 폼을 신규 등록(`/notice/new`)과 수정(`/notice/:id/edit`)에 함께 쓴다. 범칙금을 고르면 의견제출 기한과 감경 금액 입력이 숨겨진다.
- Data: NoticeInput → `saveNotice`
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 과태료 등록 성공
  - Given 홈에서 "고지서 등록" 버튼으로 `/notice/new`에 진입했을 때
  - When `{ name: '강남 주정차', kind: 'fine', amount: 40000, discountedAmount: 비움, receivedDate: '2026-10-05', opinionDeadline: '2026-10-20', paymentDeadline: 비움 }`으로 "저장" 탭
  - Then `fdc:notices:v1`에 1건이 저장된다
  - And `navigate('/notice/<id>', { replace: true, state: { justSaved: true } })`로 이동한다
  - And Toast "고지서를 등록했어요"가 표시된다
  - And `logClick('notice_save')`가 1회 호출된다
- AC-2 [E][P0]: Scenario: 범칙금 선택 시 입력 항목 전환
  - Given 등록 폼에서
  - When 유형 ChipItem "범칙금" 탭
  - Then "의견제출 기한"과 "고지서에 적힌 감경 금액" TextField가 사라진다
  - And 납부기한 필드 라벨이 "1차 납부기한"으로 바뀐다
  - And 그 아래 도움말 "비워 두면 받은 날로부터 10일 뒤로 계산해요 (도로교통법 제164조)"가 표시된다
  - And 저장 시 opinionDeadline과 discountedAmount는 null로 넘긴다. 숨기기 전에 입력한 값이 있어도 null이다
- AC-3 [W][P1]: Scenario: 필수값 누락·범위 오류
  - Given 등록 폼에서
  - When `{ name: '', amount: 0 }`으로 "저장" 탭
  - Then 이름 필드 아래 "고지서 이름을 입력해주세요", 금액 필드 아래 "금액을 1,000원 이상 입력해주세요"가 표시되고 저장되지 않는다
  - And name이 공백만으로 되어 있으면(trim 후 0자) "고지서 이름을 입력해주세요"가 표시된다
  - And name이 21자(F1-AC-14의 `countChars` 기준)이면 "이름은 20자 이내로 입력해주세요"가 표시된다
  - And name은 trim한 값으로 저장한다
  - And amount가 10,000,001이면 "금액은 1,000만원 이하로 입력해주세요"가 표시된다
  - And 과태료에서 discountedAmount가 40000(원래 금액 40000)이면 "감경 금액은 원래 금액보다 작아야 해요"가 표시된다
  - And 금액 필드는 `parseAmountInput`이 `ok`일 때 숫자만 남긴다. 붙여넣은 "4만원"은 "4"가 된다. 숫자가 하나도 없이 비면 "금액을 숫자로 입력해주세요"가 표시된다
  - And 과태료에서 discountedAmount가 0이면 "감경 금액은 1원 이상 입력해주세요"가 표시된다. 비워 두면 null로 저장되고 오류가 아니다
- AC-4 [W][P1]: Scenario: 기한 논리 오류
  - Given 과태료 유형, 받은 날 `'2026-10-05'`, today `'2026-10-09'`
  - When 의견제출 기한과 납부기한을 모두 비우고 저장 → 의견제출 기한 필드 아래 "의견제출 기한이나 납부기한 중 하나를 입력해주세요"
  - And opinionDeadline `'2026-10-01'`이면 "기한은 받은 날 이후여야 해요"
  - And receivedDate `'2026-10-10'`이면 "받은 날은 오늘 이후일 수 없어요"
  - And opinionDeadline `'2026-11-30'`, paymentDeadline `'2026-11-01'`이면 "납부기한은 의견제출 기한 이후여야 해요"
  - And 범칙금 유형에서 받은 날이 `'2026-10-05'`이고 1차 납부기한이 `'2026-10-01'`이면 "1차 납부기한은 받은 날 이후여야 해요"
  - And 받은 날(receivedDate)을 비우면 받은 날 필드 아래 "고지서 받은 날을 입력해주세요"가 표시된다
  - And 받은 날 값이 `isValidYmd`에서 false이면(예: `'2026-02-30'`) "올바른 날짜를 입력해주세요"가 표시된다
  - And 의견제출 기한·납부기한(1차 납부기한)에 값이 있는데 `isValidYmd`에서 false이면 그 필드 아래 "올바른 날짜를 입력해주세요"가 표시된다
  - Then 어느 경우에도 저장하지 않는다
- AC-5 [W][P1]: Scenario: 수정 모드와 없는 고지서
  - Given `'강남 주정차'`(amount 40000)가 저장돼 있을 때
  - When `/notice/<id>/edit`에 진입
  - Then 모든 필드가 저장값으로 채워지고 Top 제목이 "고지서 수정"이다
  - And amount를 50000으로 바꿔 저장하면 같은 id의 amount가 50000이 되고 Toast "고지서를 수정했어요"가 표시된다
  - And 존재하지 않는 id로 진입하면 빈 상태 "고지서를 찾을 수 없어요"와 "홈으로" Button이 표시된다
- AC-6 [W][P1]: Scenario: 저장 실패
  - Given 50장이 저장돼 있을 때 → "저장" 탭 시 Toast "고지서는 50장까지 등록할 수 있어요"가 표시되고 폼 입력값은 유지된다
  - Given `saveNotice`가 `{ ok: false, error: 'quota' }`를 반환할 때 → Toast "저장 공간이 부족해 저장하지 못했어요"가 표시되고 폼 입력값은 유지된다
  - Given `saveNotice`가 `{ ok: false, error: 'invalid' }`를 반환할 때(화면 검증을 통과했지만 데이터 계층 검증에 실패) → Toast "입력값을 다시 확인해 주세요"가 표시되고 폼 입력값은 유지된다. `console.error`는 0회다
- AC-7 [U][P2]: Scenario: 모바일 키보드
  - Given 금액 TextField에서
  - When "40000"을 입력
  - Then `inputMode="numeric"` 키패드가 열리고 필드에 "40,000"이 표시된다
  - And SubmitFooter의 "저장" Button은 키보드가 열려도 키보드 위에 보인다
  - And 포커스된 필드는 화면 안으로 스크롤된다
- AC-8 [E][P2]: Scenario: 납부기한 포커스 진입
  - Given 결과 화면에서 `navigate('/notice/<id>/edit', { state: { focus: 'paymentDeadline' } })`로 진입했을 때
  - Then 납부기한 TextField에 포커스가 간다
- AC-9 [W][P1]: Scenario: 기록이 있는 고지서 수정
  - Given status `'paid_early'`(paidAmount 32000, savedAmount 8000)인 '강남 주정차'를 수정 모드로 열었을 때
  - When 이름만 바꿔 "저장" 탭
  - Then status·paidAmount·savedAmount·decidedAt은 그대로 유지된다
  - And kind·amount·discountedAmount·receivedDate·opinionDeadline·paymentDeadline 중 하나라도 바꿔 "저장"을 탭하면 AlertDialog "금액이나 기한을 바꾸면 납부 기록이 초기화돼요"(버튼 "바꾸기"/"취소")가 표시된다
  - And "바꾸기"를 탭하면 `saveNotice(input, id, { resetRecord: true })`로 저장된다. status `'open'`, paidAmount null, savedAmount 0, decidedAt null이 되고 Toast "고지서를 수정했어요"가 표시된다
  - And "취소"를 탭하면 저장되지 않고 폼 입력값은 유지된다
  - And status가 `'open'`인 고지서를 수정할 때는 이 AlertDialog가 표시되지 않는다
- AC-10 [W][P1]: Scenario: 손상 데이터 상태의 등록·수정 화면
  - Given `fdc:notices:v1` 값이 `'{bad'`여서 `loadNotices()`가 `{ notices: [], corrupted: true, backupFailed: false }`를 반환할 때
  - When `/notice/<id>/edit`에 진입
  - Then 폼은 렌더되지 않고 F2-AC-5와 같은 빈 상태 "고지서를 찾을 수 없어요"와 "홈으로" Button(`navigate('/', { replace: true })`)이 표시된다
  - And `/notice/new`에 진입하면 빈 폼이 정상으로 표시된다
  - And 그 폼에서 F2-AC-1의 값으로 "저장"을 탭하면 `fdc:notices:v1`이 `{ version: 1, notices: [새 고지서 1건] }`으로 저장되고 F2-AC-1과 같이 결과 화면으로 이동한다
  - And 저장 전후로 `fdc:notices:corrupt`의 값(`{"version":1,"backups":[{"raw":"{bad"}]}`)은 바뀌지 않는다
- AC-11 [W][P0]: Scenario: 소수점·음수 금액 입력 거부
  - Given 원래 금액 필드 값이 비어 있을 때
  - When "40000.5"를 붙여넣거나 입력
  - Then 필드 값은 바뀌지 않고(빈 상태 유지) 필드 아래 "소수점 없이 원 단위로 입력해주세요"가 즉시 표시된다
  - And 400005 같은 값은 어떤 경우에도 필드에 들어가지 않는다
  - And 원래 금액이 "40,000"일 때 키패드의 "."을 누르면 값은 "40,000" 그대로이고 같은 문구가 표시된다
  - And "-5000"(또는 "−5000", "－5000")을 입력하면 값은 바뀌지 않고 "0보다 큰 금액을 입력해주세요"가 표시된다
  - And "-40000.5"는 "0보다 큰 금액을 입력해주세요"가 표시된다
  - And "고지서에 적힌 감경 금액" 필드에도 같은 규칙과 같은 문구를 적용한다
  - And 다음에 `parseAmountInput`이 `ok`인 입력이 들어오면 이 문구는 사라진다
  - And 거부 문구가 표시된 채 "저장"을 탭하면 현재 필드 값으로 F2-AC-3 검증을 다시 하고, 그 결과 문구로 바꿔 표시한다. 예: 빈 필드는 "금액을 숫자로 입력해주세요"
- AC-12 [W][P1]: Scenario: 이모지가 섞인 이름의 글자 수
  - Given 등록 폼의 이름 TextField(네이티브 `maxLength` 속성 없음)에서
  - When "🚗"를 20번 입력하고 나머지 필드를 F2-AC-1 값으로 채워 "저장" 탭
  - Then 오류 없이 저장되고 결과 화면 Top 제목에 이모지 20개가 그대로 표시된다
  - And "🚗"를 21번 입력하면 "이름은 20자 이내로 입력해주세요"가 표시되고 저장되지 않는다
  - And 글자 수는 `countChars`(코드포인트) 기준이고 UTF-16 길이(`.length`)는 쓰지 않는다
- AC-13 [W][P1]: Scenario: 받은 날 하한·기한 상한
  - Given today `'2026-10-09'`
  - When receivedDate `'2021-10-08'`로 "저장" 탭
  - Then 받은 날 필드 아래 "받은 날은 최근 5년 안의 날짜로 입력해주세요"가 표시되고 저장되지 않는다
  - And receivedDate `'2021-10-09'`(`addYears(today, -5)`)는 통과한다
  - And receivedDate `'2026-10-05'`일 때 의견제출 기한이나 납부기한(1차 납부기한)이 `'2027-10-06'`이면 그 필드 아래 "기한은 받은 날로부터 1년 안으로 입력해주세요"가 표시된다
  - And `'2027-10-05'`(`addYears(receivedDate, 1)`)는 통과한다
  - And 수정 모드에서 receivedDate를 저장값에서 바꾸지 않았으면 5년 하한 검사는 하지 않는다
- AC-14 [W][P1]: Scenario: 여러 필드가 동시에 틀렸을 때
  - Given 등록 폼에서
  - When `{ name: '', amount: 0, receivedDate: 비움 }`으로 "저장" 탭
  - Then 다음 3개 문구가 동시에 각 필드 아래 표시된다
    - "고지서 이름을 입력해주세요"
    - "금액을 1,000원 이상 입력해주세요"
    - "고지서 받은 날을 입력해주세요"
  - And 화면 순서상 첫 오류 필드(이름)에 `focus()`하고 `scrollIntoView({ block: 'center' })`한다
  - And 첫 오류 필드가 `type="date"`이면 날짜 선택기가 저절로 열리지 않도록 `focus()` 없이 `scrollIntoView({ block: 'center' })`만 한다
  - And 화면 순서는 이름 → 원래 금액 → 감경 금액 → 받은 날 → 의견제출 기한 → 납부기한이다
  - And 한 필드에는 문구를 1개만 표시하고, 우선순위는 다음과 같다
    - 이름: 비었음 → 20자 초과
    - 원래 금액: 숫자 없음 → 1,000원 미만 → 1,000만원 초과
    - 감경 금액: 0 → 원래 금액 이상(원래 금액이 유효할 때만)
    - 받은 날: 비었음 → 형식·달력 오류 → 오늘 이후 → 5년 초과
    - 의견제출 기한: 형식·달력 오류 → 둘 다 비움 → 받은 날 이전 → 1년 초과
    - 납부기한: 형식·달력 오류 → 받은 날 이전 → 의견제출 기한 이전 → 1년 초과
  - And 받은 날이 유효하지 않으면 받은 날과 비교하는 기한 검사는 하지 않는다
  - And 필드 값을 바꾸면 그 필드의 에러 문구만 사라진다. 다른 필드 문구는 다음 "저장" 탭까지 유지된다
- AC-15 [W][P0]: Scenario: 백업하지 못한 손상 데이터 위에 저장
  - Given `loadNotices()`가 `{ corrupted: true, backupFailed: true }`를 반환하는 상태에서 `/notice/new`에 진입했을 때
  - When F2-AC-1의 값으로 "저장" 탭 (`saveNotice`가 `{ ok: false, error: 'unbacked' }`를 반환)
  - Then AlertDialog가 표시된다
    - 제목: "저장하면 이전 데이터가 지워져요"
    - 설명: "읽을 수 없던 이전 데이터를 백업하지 못했어요. 지운 데이터는 되돌릴 수 없어요."
    - 버튼: "저장하기"/"취소"
  - And "저장하기"를 탭하면 `saveNotice(input, undefined, { discardCorrupt: true })`로 저장된다. 이후는 F2-AC-1과 같이 결과 화면 이동과 Toast "고지서를 등록했어요"다
  - And "취소"를 탭하면 저장되지 않고 폼 입력값은 유지되며 `fdc:notices:v1`은 원문 그대로다
  - And `logClick('notice_save')`는 처음 "저장" 탭에서 1회만 호출된다
  - And "저장하기" 후 `saveNotice`가 `'quota'`를 반환하면 F2-AC-6과 같이 Toast "저장 공간이 부족해 저장하지 못했어요"가 표시된다
- AC-16 [W][P1]: Scenario: 저장소 접근 불가
  - Given `loadNotices()`가 `{ unavailable: true }`를 반환할 때
  - When `/notice/<id>/edit`에 진입
  - Then 폼은 렌더되지 않는다. 대신 `Asset.ContentIcon`, "저장 공간에 접근할 수 없어요", Paragraph.Text "토스 앱을 다시 실행한 뒤 시도해 주세요", "홈으로" Button(`navigate('/', { replace: true })`)이 표시된다
  - And `/notice/new`에서는 폼이 표시된다. "저장" 탭 시 `saveNotice`가 `{ ok: false, error: 'unavailable' }`를 반환하면 Toast "저장 공간에 접근할 수 없어 저장하지 못했어요"가 표시되고 폼 입력값은 유지된다
- AC-17 [W][P1]: Scenario: 새 버전 데이터가 있을 때
  - Given `loadNotices()`가 `{ newerVersion: true }`를 반환할 때
  - When `/notice/<id>/edit`에 진입
  - Then 폼은 렌더되지 않는다. 대신 `Asset.ContentIcon`, "새 버전 앱에서 저장한 데이터가 있어요", Paragraph.Text "토스 앱을 다시 실행한 뒤 시도해 주세요", "홈으로" Button(`navigate('/', { replace: true })`)이 표시된다
  - And `/notice/new`에서는 폼이 표시된다. "저장" 탭 시 `saveNotice`가 `{ ok: false, error: 'newer_version' }`를 반환하면 Toast "새 버전 앱에서 저장한 데이터가 있어 저장하지 못했어요"가 표시된다
  - And 이때 폼 입력값은 유지되고 AlertDialog(F2-AC-15)는 표시되지 않으며 `fdc:notices:v1`은 원문 그대로다

### F3. 고지서 결과 화면 — 무료 층 (D-day & 금액 비교)
- Description: 고지서 1장의 핵심 답을 보여 준다. 다음 기한까지 남은 D-day, 지금 내면 얼마인지, 기한을 넘기면 얼마인지가 핵심 답이다. 이 층은 광고와 관계없이 항상 보인다. 사용자는 이것만으로 감경가로 낼지 결정할 수 있다.
- Data: Notice (조회), FineComparison, PenaltyStages, KeyDeadline
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 과태료 결과 표시 (Value AC)
  - Given `{ name: '강남 주정차', kind: 'fine', amount: 40000, discountedAmount: null, receivedDate: '2026-10-05', opinionDeadline: '2026-10-20', paymentDeadline: null }`이 저장돼 있고 today가 `'2026-10-09'`일 때
  - When `/notice/<id>`에 진입
  - Then `data-testid="free-tier"` 안에 다음이 표시된다
    - "감경 마감까지 D-11 · 2026.10.20(화)"
    - "감경 납부액 32,000원"과 배지 "8,000원 절약"
    - "감경 기한 후 40,000원"
    - "납부기한까지 안 내면 41,200원부터"
- AC-2 [U][P0]: Scenario: 무료 층은 광고와 무관하게 보인다
  - Given 광고가 한 번도 뜨지 않는 환경(`VITE_TOSS_AD_SLOT_ID` 미설정·광고 로드 실패·타임아웃 — 템플릿 TossRewardAd는 이때 게이트를 자동으로 연다)
  - When 사용자가 `/notice/<id>`(F3-AC-1의 고지서)에 진입
  - Then `data-testid="free-tier"` 영역에 "D-11"과 "32,000원", "40,000원"이 표시된다
  - And free-tier 영역은 TossRewardAd의 자식이 아니다
- AC-3 [U][P0]: Scenario: 결과 화면 레이아웃
  - Given F3-AC-1의 고지서
  - Then `data-testid="dday-hero"`는 SummaryHero로 렌더되고 값 "D-11"(CountUp)과 보조문 "2026.10.20(화)"를 가진다
  - And `data-testid="compare-card"`는 Card 1개 안에 ListRow 3개(감경 납부액·감경 기한 후·체납 시)를 가진다
  - And 감경 납부액은 t2 타이포와 Badge "8,000원 절약"으로 강조된다
- AC-4 [S][P0]: Scenario: 감경 마감이 지난 과태료
  - Given F3-AC-1의 고지서에 `paymentDeadline: '2026-11-30'`이 있고 today가 `'2026-10-21'`일 때
  - When 결과 화면에 진입
  - Then dday-hero는 "납부기한까지 D-40 · 2026.11.30(월)"을 표시한다
  - And compare-card의 감경 납부액 행은 "감경 기간이 끝났어요" 문구와 함께 비활성 색(`var(--adaptiveGrey400)`)으로 표시된다
  - And "지금 내면 40,000원"이 강조된다
- AC-5 [E][P0]: Scenario: 범칙금 결과
  - Given `{ name: '출근길 속도위반', kind: 'penalty', amount: 40000, receivedDate: '2026-10-05', paymentDeadline: null }`, today `'2026-10-09'`
  - When 결과 화면에 진입
  - Then dday-hero는 "1차 납부기한까지 D-6 · 2026.10.15(목)"을 표시한다
  - And compare-card에 "1차 기한 안에 40,000원", "2차 기한(2026.11.04)까지 48,000원", "그 뒤엔 즉결심판이 청구돼요 (도로교통법 제165조)"가 표시된다
  - And 감경 관련 문구는 표시되지 않는다
- AC-6 [S][P1]: Scenario: 감경 규칙 안내와 법적 고지
  - Given 과태료 결과 화면에서 감경 마감 전일 때
  - Then compare-card 아래 Paragraph.Text "감경은 의견제출 기한 안에 스스로 납부할 때만 적용돼요 (질서위반행위규제법 제18조)"가 표시된다
  - And 화면 하단에 "법령의 일반 기준으로 계산한 참고값이에요. 고지서에 적힌 금액과 기한이 우선이에요."가 표시된다
- AC-7 [W][P1]: Scenario: 없는 고지서 / 손상 데이터
  - Given 존재하지 않는 id로 `/notice/abc`에 진입하거나 `loadNotices().corrupted === true`일 때
  - Then `Asset.ContentIcon`과 "고지서를 찾을 수 없어요", "홈으로" Button(`navigate('/', { replace: true })`)이 표시된다
  - And free-tier와 locked-tier는 렌더되지 않는다
- AC-8 [E][P1]: Scenario: 저장 직후 진입·노출·공유
  - Given `location.state = { justSaved: true }`로 진입했을 때
  - Then `logImpression('result_free_tier')`가 1회 호출된다
  - And "공유하기" Button 탭 시 `logClick('result_share')` 후 `shareApp()`이 호출된다
  - And `justSaved`가 없는 진입에서도 `logImpression('result_free_tier')`는 화면 진입당 1회만 호출된다
- AC-9 [S][P1]: Scenario: 납부기한 없이 감경 마감이 지난 과태료
  - Given `{ kind: 'fine', amount: 40000, opinionDeadline: '2026-10-20', paymentDeadline: null }`, today `'2026-10-21'`
  - When 결과 화면에 진입
  - Then dday-hero는 값 "납부기한을 입력해 주세요"와 보조문 "감경 마감 2026.10.20(화)이 지났어요"를 표시한다
  - And hero 바로 아래 Button "납부기한 입력"이 표시된다. 탭하면 `navigate('/notice/<id>/edit', { state: { focus: 'paymentDeadline' } })`로 이동한다
  - And compare-card에서 감경 납부액 행은 "감경 기간이 끝났어요" 문구와 함께 비활성 색(`var(--adaptiveGrey400)`)으로 표시된다
  - And "지금 내면 40,000원"이 강조되고, "납부기한까지 안 내면 41,200원부터" 행은 그대로 표시된다
  - And Badge "N원 절약"은 표시되지 않는다
- AC-10 [W][P1]: Scenario: 모든 기한이 지난 고지서
  - Given 과태료 `{ amount: 40000, opinionDeadline: '2026-10-20', paymentDeadline: '2026-11-30' }`, today `'2026-12-01'`
  - When 결과 화면에 진입
  - Then dday-hero는 "납부기한이 지났어요 · D+1 · 2026.11.30(월)"을 표시한다
  - And compare-card의 감경 납부액·감경 기한 후 행은 모두 비활성 색으로 표시된다
  - And "지금 내면 41,200원부터"가 강조되고, 그 아래 "한 달이 지날 때마다 중가산금이 더 붙어요 (질서위반행위규제법 제24조)"가 표시된다
  - And 범칙금 `{ amount: 40000, receivedDate: '2026-10-05', paymentDeadline: null }`이고 today가 `'2026-11-05'`이면 다음과 같이 표시된다
    - dday-hero: "2차 납부기한이 지났어요 · D+1 · 2026.11.04(수)"
    - compare-card: 1차·2차 행은 비활성 색, "즉결심판이 청구될 수 있어요 — 금액은 법원이 정해요 (도로교통법 제165조)"는 강조
  - And 두 경우 모두 Badge "N원 절약"은 표시되지 않는다
- AC-11 [W][P1]: Scenario: 공유 실패
  - Given 결과 화면에서
  - When "공유하기" 탭 후 `shareApp()`이 예외를 던지거나 Promise가 reject될 때
  - Then Toast "공유하지 못했어요. 잠시 후 다시 시도해 주세요"가 1회 표시되고 화면은 그대로 유지된다
  - And `console.error` 호출은 0회다
  - And 오류의 `name`이 `'AbortError'`이면(사용자가 공유 시트를 닫음) Toast를 표시하지 않는다(Open Questions 8)
  - And `shareApp()`이 끝날 때까지 "공유하기" Button은 `loading` 상태라 다시 탭해도 `shareApp()`이 추가로 호출되지 않는다
  - And `logClick('result_share')`는 탭 1회당 1회 호출된다
- AC-12 [W][P1]: Scenario: 저장소 접근 불가
  - Given `loadNotices()`가 `{ unavailable: true }`를 반환할 때
  - When `/notice/<id>`에 진입
  - Then `Asset.ContentIcon`, "저장 공간에 접근할 수 없어요", Paragraph.Text "토스 앱을 다시 실행한 뒤 시도해 주세요", "홈으로" Button(`navigate('/', { replace: true })`)이 표시된다
  - And free-tier와 locked-tier는 렌더되지 않고 `TossRewardAd`도 마운트되지 않는다(광고 로드 요청 0회)
  - And `logImpression('result_free_tier')`와 `logImpression('scenario_locked_tier')`는 0회 호출된다
- AC-13 [W][P1]: Scenario: 새 버전 데이터가 있을 때
  - Given `loadNotices()`가 `{ newerVersion: true }`를 반환할 때
  - When `/notice/<id>`에 진입
  - Then `Asset.ContentIcon`, "새 버전 앱에서 저장한 데이터가 있어요", Paragraph.Text "토스 앱을 다시 실행한 뒤 시도해 주세요", "홈으로" Button(`navigate('/', { replace: true })`)이 표시된다
  - And free-tier와 locked-tier는 렌더되지 않고 `TossRewardAd`도 마운트되지 않는다(광고 로드 요청 0회)
  - And `logImpression('result_free_tier')`와 `logImpression('scenario_locked_tier')`는 0회 호출된다

### F4. 결과 심화 층 — 월별 가산금 시나리오 (리워드 게이트)
- Description: 기한을 넘겼을 때 금액이 월별로 어떻게 불어나는지 보여 준다. 과태료는 0~60개월 가산금·중가산금 표와 추이 그래프, 범칙금은 1·2차·즉결심판 날짜 타임라인이다. 결과 화면의 무료 층 아래 블록 하나로 `TossRewardAd`의 자식으로만 렌더된다. 새 라우트나 새 저장 스키마는 없다.
- Data: Notice (조회), FineScenarioRow[], PenaltyStages
- API: 없음
- Requirements:
- AC-1 [E][P1]: Scenario: 더 깊은 층은 게이트 뒤에 있다
  - Given 결과 화면의 `data-testid="locked-tier"` 영역이 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`의 자식으로 렌더될 때
  - When 광고 시청이 완료되거나, 광고를 띄울 수 없어 게이트가 자동으로 열림
  - Then locked-tier 영역에 과태료 40,000원 기준 "체납 1개월 41,680원 · 12개월 46,960원 · 60개월 70,000원"을 포함한 월별 표가 표시된다
- AC-2 [U][P0]: Scenario: 과태료 월별 표 값
  - Given amount 40000인 과태료
  - Then locked-tier에 `data-testid="scenario-row"` ListRow 8개가 이 순서로 표시된다
    - 납부기한 다음 날 41,200원
    - 1개월 41,680원
    - 3개월 42,640원
    - 6개월 44,080원
    - 12개월 46,960원
    - 24개월 52,720원
    - 36개월 58,480원
    - 60개월 70,000원
  - And 표 위에 "한 달 늦을 때마다 480원씩 더 붙어요"가 표시된다
- AC-3 [U][P0]: Scenario: 60개월 상한 안내
  - Given 과태료 locked-tier가 열렸을 때
  - Then 표 아래에 "중가산금은 60개월까지만 붙어요 — 최대 원래 금액의 75% (질서위반행위규제법 제24조)"가 표시된다
- AC-4 [U][P2]: Scenario: 추이·비중 시각화
  - Given amount 40000인 과태료 locked-tier
  - Then `data-testid="scenario-sparkline"` Sparkline이 month 0~60의 total 61개 점으로 그려진다
  - And `data-testid="scenario-minibar"` MiniBar가 원래 금액 40,000원과 최대 가산금 30,000원 비중을 표시한다
- AC-5 [E][P1]: Scenario: 범칙금 날짜 타임라인
  - Given `{ kind: 'penalty', amount: 40000, receivedDate: '2026-10-05' }`
  - When locked-tier가 열림
  - Then ListRow 3개가 순서대로 "~2026.10.15 40,000원", "2026.10.16~2026.11.04 48,000원", "2026.11.05부터 즉결심판 청구 — 금액은 법원이 정해요"를 표시한다
- AC-6 [S][P1]: Scenario: 납부기한 미입력 과태료
  - Given 과태료에 `paymentDeadline: null`
  - When locked-tier가 열림
  - Then 표의 행 라벨은 "납부기한 다음 날", "1개월" 같은 상대 표기만 쓴다
  - And "본 고지서의 납부기한을 입력하면 체납 시작일도 보여드려요" 문구와 "납부기한 입력" Button이 표시된다
  - And 버튼을 탭하면 `navigate('/notice/<id>/edit', { state: { focus: 'paymentDeadline' } })`로 이동한다
  - And `paymentDeadline: '2026-11-30'`이면 첫 행 라벨이 "2026.12.01부터"다
- AC-7 [W][P1]: Scenario: 광고 실패 시 fail-open
  - Given 광고 로드가 실패하거나 슬롯 ID가 비어 있을 때
  - When 결과 화면에 진입
  - Then 에러 Toast나 console.error 없이 locked-tier가 열린다
  - And locked-tier가 처음 렌더될 때 `logImpression('scenario_locked_tier')`가 1회 호출된다
- AC-8 [W][P1]: Scenario: 없는 고지서·손상·새 버전 데이터에서는 게이트를 띄우지 않는다
  - Given 다음 중 하나일 때
    - 존재하지 않는 id로 `/notice/abc`에 진입
    - `loadNotices().corrupted === true`
    - `loadNotices().newerVersion === true`
  - Then `TossRewardAd`가 마운트되지 않아 광고 로드 요청이 0회다
  - And `logImpression('scenario_locked_tier')`는 0회 호출된다
- AC-9 [W][P1]: Scenario: 광고를 끝까지 보지 않고 닫음
  - Given `VITE_TOSS_AD_SLOT_ID`가 설정되어 광고가 로드된 결과 화면에서
  - When 사용자가 게이트(템플릿 TossRewardAd)의 잠금 해제를 탭해 광고를 연 뒤, 보상 지급 전에 닫음
  - Then locked-tier는 렌더되지 않는다
  - And 게이트 바로 위, `TossRewardAd` 바깥의 Paragraph.Text `data-testid="locked-hint"`가 계속 표시된다
    - 과태료: "광고를 끝까지 보면 월별 가산금 표가 열려요"
    - 범칙금: "광고를 끝까지 보면 납부 단계별 날짜표가 열려요"
  - And 템플릿 게이트의 잠금 해제 동작이 그대로 남아 있어 다시 탭하면 광고를 다시 시도할 수 있다. 앱은 재시도 횟수를 제한하지 않는다
  - And 에러 Toast는 표시되지 않고 `console.error` 호출과 `logImpression('scenario_locked_tier')` 호출은 0회다
  - And free-tier, "납부·결정 기록" 버튼, 공유·삭제 버튼은 그대로 쓸 수 있다
  - And locked-hint는 locked-tier가 처음 렌더되면 숨긴다. locked-tier 마운트를 `useLayoutEffect`로 감지한다. 그래서 fail-open 환경(F4-AC-7)에서는 첫 화면부터 locked-hint가 보이지 않는다
  - And 잠금 해제 여부는 저장하지 않는다. 결과 화면을 나갔다 다시 들어오면 게이트가 다시 걸린다

### F5. 홈 — 고지서 목록 & D-day 정렬
- Description: 등록한 고지서를 사용자가 붙인 이름 그대로 카드로 나열한다. 다음 기한까지 남은 D-day 순으로 정렬한다. 상단 히어로에는 지금 기한 안에 내면 아낄 수 있는 금액 합계를 보여 줘서 "이번 주에 무엇부터 낼지"를 정하게 한다.
- Data: Notice[] (조회), `getKeyDeadline`, `potentialSaving`, `currentDueAmount`
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: D-day 순 정렬 목록
  - Given today `'2026-10-09'`이고 다음 3건이 저장돼 있을 때
    - A `{ name: '강남 주정차', fine, 40000, opinionDeadline: '2026-10-20' }`
    - B `{ name: '출근길 속도위반', penalty, 60000, receivedDate: '2026-10-05' }`
    - C `{ name: '마트 앞 주정차', fine, 40000, opinionDeadline: '2026-10-11' }`
  - When 홈 `/`에 진입
  - Then `data-testid="notice-card"` 3개가 C(D-2) → B(D-6) → A(D-11) 순으로 표시된다
  - And 각 카드에는 이름, 기한 라벨, D-day, 지금 낼 금액(C 32,000원 · B 60,000원 · A 32,000원)이 나온다
  - And `notice-card` 목록에는 status가 `'open'`인 고지서만 나온다. `paid_early`·`paid_late`·`objected`는 "정리한 고지서" 섹션(F6-AC-2)에만 나온다
- AC-2 [U][P0]: Scenario: 아낄 수 있는 금액 히어로
  - Given F5-AC-1의 3건
  - Then `data-testid="savings-hero"` SummaryHero가 "기한 안에 내면 아끼는 돈 28,000원"(8,000 + 12,000 + 8,000, CountUp)을 표시한다
  - And 보조문 "고지서 3장 · 가장 급한 건 마트 앞 주정차 D-2"가 함께 표시된다
  - And 합계·장수·가장 급한 건은 status가 `'open'`인 고지서만 센다. 위 3건에 status `'paid_early'`인 고지서(savedAmount 8,000)가 하나 더 있어도 히어로는 28,000원·3장 그대로다
  - And open인 고지서가 0건이고 정리한 고지서만 있으면 savings-hero 대신 Paragraph.Text "남은 고지서가 없어요"가 표시된다
- AC-3 [S][P1]: Scenario: 임박·경과 배지
  - Given today `'2026-10-09'`
  - Then D-0~D-3인 카드에는 Badge "마감 임박", D+1 이상인 카드에는 Badge "기한 지남"이 표시된다
  - And 지난 기한(음수)인 카드가 목록 맨 위에 온다
  - And `getKeyDeadline`이 null인 카드는 `getLastDeadline`의 dday(음수)로 정렬하고 표시한다. 예: today `'2026-12-01'`에 납부기한 `'2026-11-30'`이 지난 과태료는 "납부기한 지남 · D+1"과 지금 낼 금액 "41,200원부터"로 표시되고 맨 위에 온다
  - And dday가 같으면 createdAt 오름차순으로 정렬한다
- AC-4 [S][P1]: Scenario: 빈 상태
  - Given 저장된 고지서가 0건일 때
  - Then `Asset.ContentIcon`, "받은 고지서를 등록해 보세요", "감경 마감과 늦으면 붙는 금액을 계산해 드려요", "고지서 등록" Button이 표시된다
  - And savings-hero와 AdSlot은 렌더되지 않는다
- AC-5 [E][P0]: Scenario: 등록·상세 이동
  - Given 홈에서
  - When 하단 SubmitFooter "고지서 등록" Button 탭 → `logClick('home_add_notice')` 후 `navigate('/notice/new')`
  - And 카드 탭 → `logClick('home_open_notice')` 후 `navigate('/notice/<id>')`
  - Then 50장이 저장된 상태에서 "고지서 등록" 탭 시 이동하지 않고 Toast "고지서는 50장까지 등록할 수 있어요"가 표시된다
- AC-6 [W][P1]: Scenario: 손상 데이터
  - Given `fdc:notices:v1` 값이 `'{bad'`일 때(F1-AC-15~17의 검증 실패 데이터 포함)
  - When 홈 진입
  - Then Toast "저장된 데이터를 읽을 수 없어 새로 시작해요"가 1회 표시되고 빈 상태(F5-AC-4)가 표시된다
- AC-7 [U][P1]: Scenario: 배너 위치와 스크롤
  - Given 고지서가 1건 이상일 때
  - Then `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`가 마지막 카드 아래 한 곳에만 렌더되고 카드 사이에는 끼지 않는다
  - And 목록은 최대 50건이라 일반 스크롤(가상 스크롤 없음)로 표시된다
  - And SubmitFooter는 마지막 카드를 가리지 않는다(목록 하단에 footer 높이만큼 Spacing)
- AC-8 [E][P2]: Scenario: 삭제 후 복귀 Toast
  - Given `location.state = { deletedName: '강남 주정차' }`로 진입했을 때
  - Then Toast "'강남 주정차' 고지서를 삭제했어요"가 1회 표시된다
- AC-9 [W][P0]: Scenario: 손상 데이터를 백업하지 못함
  - Given `fdc:notices:v1` 값이 `'{bad'`이고 `loadNotices()`가 `{ corrupted: true, backupFailed: true }`를 반환할 때(백업 쓰기 실패 또는 백업 3개가 이미 참)
  - When 홈 진입
  - Then Toast "저장된 데이터를 읽을 수 없어 새로 시작해요"가 1회 표시되고 빈 상태(F5-AC-4)가 표시된다
  - And 빈 상태 문구 아래 Paragraph.Text `data-testid="unbacked-warning"` "이전 데이터를 백업하지 못했어요. 새 고지서를 등록하면 이전 데이터는 지워져요"가 계속 표시된다
  - And 다음 홈 진입에서 `loadNotices`의 백업 재시도가 성공하면(`backupFailed: false`) unbacked-warning은 표시되지 않는다
- AC-10 [W][P1]: Scenario: 저장소 접근 불가
  - Given `loadNotices()`가 `{ unavailable: true }`를 반환할 때
  - When 홈 진입
  - Then `Asset.ContentIcon`, "저장 공간에 접근할 수 없어요", Paragraph.Text "토스 앱을 다시 실행한 뒤 시도해 주세요", Button "다시 시도"가 표시된다
  - And 다음은 렌더되지 않는다
    - savings-hero
    - notice-card
    - "정리한 고지서" 섹션
    - AdSlot
    - SubmitFooter "고지서 등록"
  - And 손상 데이터 Toast(F5-AC-6)는 표시되지 않는다
  - And "다시 시도"를 탭하면 `loadNotices()`를 다시 호출한다. `unavailable: false`이면 일반 홈(F5-AC-1 또는 F5-AC-4)으로 바뀌고, 여전히 `true`이면 같은 화면이 유지된다
- AC-11 [W][P1]: Scenario: 새 버전 데이터가 있을 때
  - Given `loadNotices()`가 `{ newerVersion: true }`를 반환할 때
  - When 홈 진입
  - Then `Asset.ContentIcon`, "새 버전 앱에서 저장한 데이터가 있어요", Paragraph.Text "토스 앱을 다시 실행한 뒤 시도해 주세요", Button "다시 시도"가 표시된다
  - And F5-AC-10과 같은 요소(savings-hero, notice-card, "정리한 고지서" 섹션, AdSlot, SubmitFooter "고지서 등록")는 렌더되지 않는다
  - And 손상 데이터 Toast(F5-AC-6)와 unbacked-warning(F5-AC-9)은 표시되지 않는다
  - And "다시 시도"를 탭하면 `loadNotices()`를 다시 호출한다. `newerVersion: false`이면 결과에 맞는 홈으로 바뀌고, 여전히 `true`이면 같은 화면이 유지된다

### F6. 납부·결정 기록 & 아낀 금액 누적
- Description: 결과 화면에서 "감경가로 납부했어요 / 기한 지나서 납부했어요 / 의견제출을 했어요 / 아직 결정 안 했어요" 중 하나를 기록한다. 기록하면 홈에서 미결정 목록과 분리되고, 기한 안에 내서 아낀 금액이 누적 표시된다. 고지서 삭제도 여기서 한다.
- Data: Notice.status, paidAmount, savedAmount, decidedAt, updatedAt — `updateStatus`, `deleteNotice`
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 감경 납부 기록
  - Given F3-AC-1의 고지서, today `'2026-10-09'`
  - When 결과 화면 "납부·결정 기록" Button → BottomSheet에서 ListRow "감경가 32,000원으로 납부했어요" 탭
  - Then status `'paid_early'`, paidAmount 32000, savedAmount 8000, decidedAt `'2026-10-09'`로 저장된다
  - And Toast "감경 납부를 기록했어요. 8,000원 아꼈어요"가 표시된다
  - And `logClick('mark_paid_early')`, `requestReviewOnce()`가 각 1회 호출된다
- AC-2 [E][P0]: Scenario: 홈 정리 섹션과 누적 절약액
  - Given F6-AC-1 기록 후 홈에 진입
  - Then '강남 주정차'는 상단 목록에서 빠지고 "정리한 고지서" 섹션에 "감경 납부 · 32,000원" ListRow로 표시된다
  - And 섹션 상단에 `data-testid="saved-total"` "지금까지 아낀 금액 8,000원"이 표시된다
  - And "정리한 고지서" 섹션에는 status가 `'paid_early'`·`'paid_late'`·`'objected'`인 고지서가 모두 decidedAt 내림차순으로 나온다. decidedAt이 같으면 updatedAt 내림차순이다. ListRow 문구는 상태별로 다음과 같다
    - paid_early이면서 과태료이고 paidAmount가 감경 납부액과 같을 때: "감경 납부 · 32,000원"
    - 그 밖의 paid_early: "기한 내 납부 · 40,000원"
    - paid_late: "기한 후 납부 · 41,200원"
    - objected: "의견제출 · 결과 기다리는 중 · 납부기한 2026.11.30". 납부기한이 없으면 "의견제출 · 결과 기다리는 중"
  - And saved-total은 모든 고지서의 savedAmount 합이다(paid_late·objected는 0)
- AC-3 [E][P1]: Scenario: 의견제출 기록
  - Given 과태료 `{ opinionDeadline: '2026-10-20', paymentDeadline: '2026-11-30' }`
  - When BottomSheet에서 "의견제출을 했어요" 탭
  - Then status `'objected'`가 되고, 결과 화면 dday-hero 위에 "의견제출 결과를 기다리는 중이에요. 받아들여지지 않으면 감경 없이 부과될 수 있어요" 문구가 표시된다
  - And 기준 기한은 납부기한(2026.11.30)이다
  - And 범칙금에는 이 옵션이 표시되지 않는다
- AC-4 [E][P1]: Scenario: 기록 되돌리기
  - Given status `'paid_early'`인 고지서
  - When BottomSheet에서 "아직 결정 안 했어요" 탭
  - Then status `'open'`, paidAmount null, savedAmount 0, decidedAt null로 돌아간다
  - And 홈 상단 목록에 다시 나타난다
- AC-5 [E][P1]: Scenario: 삭제
  - Given 결과 화면에서
  - When "삭제" Button 탭
  - Then AlertDialog "'강남 주정차' 고지서를 삭제할까요?"(버튼 "삭제"/"취소")가 표시된다
  - And "삭제" 탭 시 저장소에서 제거되고 `navigate('/', { replace: true, state: { deletedName: '강남 주정차' } })`로 이동한다
  - And "취소" 탭 시 아무것도 바뀌지 않는다
  - And `deleteNotice`가 `{ ok: false, error: 'quota' }`를 반환하면 Toast "저장 공간이 부족해 삭제하지 못했어요"가 표시되고 결과 화면에 그대로 머문다
- AC-6 [S][P1]: Scenario: 시점에 따른 옵션 문구
  - Given 과태료의 감경 마감이 지났고(today `'2026-10-21'`) 납부기한 `'2026-11-30'` 전일 때
  - Then 첫 옵션은 "기한 안에 40,000원 납부했어요"이고, 선택하면 savedAmount는 1200이다
  - And 범칙금 1차 기한 전이면 "1차 기한 안에 40,000원 납부했어요"(savedAmount 8000)다
- AC-7 [W][P1]: Scenario: 기록 저장 실패
  - Given `localStorage.setItem`이 `QuotaExceededError`를 던질 때
  - When 상태 옵션 탭 (`updateStatus`가 `{ ok: false, error: 'quota' }`를 반환)
  - Then Toast "저장 공간이 부족해 기록하지 못했어요"가 표시되고 status는 이전 값 그대로다
- AC-8 [E][P1]: Scenario: 기한 지나서 납부 기록
  - Given 과태료 `{ name: '강남 주정차', amount: 40000, opinionDeadline: '2026-10-20', paymentDeadline: '2026-11-30' }`, today `'2026-12-01'`(`getKeyDeadline`이 null)
  - When 결과 화면에서 "납부·결정 기록" BottomSheet를 연다
  - Then 첫 옵션은 "기한 지나서 41,200원 납부했어요"다
  - And "감경가 … 납부했어요"와 "기한 안에 … 납부했어요" 옵션은 표시되지 않는다
  - And 이 옵션을 탭하면 status `'paid_late'`, paidAmount 41200, savedAmount 0, decidedAt `'2026-12-01'`로 저장된다
  - And Toast "납부를 기록했어요"가 표시되고 `logClick('mark_paid_late')`가 1회 호출된다. `requestReviewOnce()`는 호출되지 않는다
  - And 홈 "정리한 고지서" 섹션에 "기한 후 납부 · 41,200원"으로 표시된다
  - And `getKeyDeadline`이 null이 아닌 고지서에서는 "기한 지나서" 옵션이 표시되지 않는다
- AC-9 [W][P1]: Scenario: 저장소 접근 불가 등으로 기록·삭제 실패
  - Given 결과 화면이 렌더된 뒤 `localStorage.setItem`이 `SecurityError`를 던질 때
  - When 상태 옵션 탭 (`updateStatus`가 `{ ok: false, error: 'unavailable' }`를 반환)
  - Then Toast "저장 공간에 접근할 수 없어 기록하지 못했어요"가 표시되고 status는 이전 값 그대로다
  - And 이때 `requestReviewOnce()`와 `logClick('mark_*')`의 성공 후 호출은 일어나지 않는다
  - And 삭제 확인 "삭제" 탭에서 `deleteNotice`가 `{ ok: false, error: 'unavailable' }`를 반환하면 Toast "저장 공간에 접근할 수 없어 삭제하지 못했어요"가 표시되고 결과 화면에 그대로 머문다
  - And `updateStatus`·`deleteNotice`가 `'newer_version'`이나 `'invalid'`를 반환하면 다음과 같다
    - 기록: Toast "기록하지 못했어요. 토스 앱을 다시 실행한 뒤 시도해 주세요"
    - 삭제: Toast "삭제하지 못했어요. 토스 앱을 다시 실행한 뒤 시도해 주세요"
    - 두 경우 모두 결과 화면에 그대로 머물고 `console.error`는 0회다

### F7. 검수 대응 & 공통 품질
- Description: 앱인토스 검수 반려 사유를 막는 공통 규칙과, 라우트가 없는 경우의 빈 화면을 정한다. 모든 화면에 적용된다.
- Data: 없음
- API: 없음
- Requirements:
- AC-1 [W][P0]: Scenario: 외부 도메인 이탈 금지
  - Given 앱 전체 소스에서
  - Then `window.location.href = 'http`, `window.open(` 호출이 0건이다
  - And 화면에 외부 URL 링크(`<a href="http...">`)가 0개다. 납부처는 "고지서의 가상계좌, 이파인, 위택스에서 낼 수 있어요"라는 텍스트로만 안내한다
- AC-2 [W][P0]: Scenario: 앱 설치 유도·외부 로깅 금지
  - Given 빌드 산출물에서
  - Then "앱을 설치", "다운로드" 문구가 0건이다
  - And `google-analytics`, `gtag`, `amplitude`, `mixpanel` 문자열이 0건이다
- AC-3 [W][P0]: Scenario: HEX 하드코딩 금지
  - Given `src/**/*.{ts,tsx,css}`에서
  - Then 정규식 `#[0-9a-fA-F]{3,8}\b` 색상 리터럴이 0건이다
  - And `var(--tds-color-` 사용이 0건이다
- AC-4 [U][P0]: Scenario: 콘솔 에러 0개
  - Given 프로덕션 빌드로 홈 → 등록 → 결과 → 기록 → 삭제 흐름을 실행할 때
  - Then `console.error` 호출이 0회다
- AC-5 [U][P1]: Scenario: Android 7+ / iOS 16+ 호환
  - Given 소스에서
  - Then `crypto.randomUUID`, `structuredClone`, `Array.prototype.findLast`, `Object.hasOwn`, `Array.prototype.at` 사용이 0건이다
  - And Vite `build.target`은 `['es2017', 'safari15']` 이하다
- AC-6 [U][P1]: Scenario: 터치 영역
  - Given 모든 화면에서
  - Then Button, ListRow, ChipItem, BottomSheet 옵션의 높이가 44px 이상이다
- AC-7 [S][P1]: Scenario: 없는 경로
  - Given 사용자가 `/unknown`에 진입했을 때
  - Then `Asset.ContentIcon`, "페이지를 찾을 수 없어요", "홈으로" Button(`navigate('/', { replace: true })`)이 표시된다
- AC-8 [W][P2]: Scenario: 결제·프로모션 미사용
  - Given 소스에서
  - Then `TossPurchase`, `IAP.`, `grantPromotionReward` 사용이 0건이다(이 MVP는 광고만 쓴다)
- AC-9 [W][P2]: Scenario: 배너 광고 로드 실패
  - Given 홈(고지서 1건 이상) 또는 결과 화면에서 `AdSlot` 로드가 실패하거나 `VITE_TOSS_AD_GROUP_ID`가 비어 있을 때
  - Then 화면에 표시되는 안내 문구는 없다(에러 Toast 0회, `console.error` 0회)
  - And 앱 코드는 `AdSlot`을 고정 높이(`height`·`min-height`)나 배경색을 가진 요소로 감싸지 않는다. 그래서 앱이 만든 빈 자리가 남지 않는다. 빈 영역 처리는 템플릿 AdSlot 동작을 따른다
  - And 법적 고지, 공유·삭제 버튼, 목록 카드의 위치와 동작은 광고 성공 시와 같다
- AC-10 [W][P2]: Scenario: 렌더 중 예기치 못한 예외
  - Given 앱 번들이 로드된 뒤 어떤 화면 컴포넌트가 렌더 중 예외를 던질 때(라우트 전체를 감싼 ErrorBoundary가 잡음)
  - Then `Asset.ContentIcon`, "일시적인 문제가 생겼어요", Paragraph.Text "다시 시도해도 계속되면 토스 앱을 다시 실행해 주세요", Button "다시 시도"가 표시된다
  - And "다시 시도"를 탭하면 `window.location.reload()`로 다시 불러온다(외부 도메인 이동 아님)
  - And 앱 번들 자체가 로드되지 않는 경우는 앱 코드가 실행되지 않아 이 화면을 그릴 수 없다. 이 경우는 플랫폼 처리 범위다(Open Questions 7)

## Screen Definitions

### S1. 홈 — `/`
- Top: 제목 "과태료 감경시계"
- TDS·템플릿 컴포넌트
  - ScreenScaffold
  - SummaryHero(`data-testid="savings-hero"`, CountUp)
  - Card 안의 ListRow(`data-testid="notice-card"`, 고지서 1장당 1개)와 Badge("마감 임박"/"기한 지남")
  - Paragraph.Text(섹션 제목 "정리한 고지서", `data-testid="saved-total"`, `data-testid="unbacked-warning"`)
  - Spacing, AdSlot, SubmitFooter + Button("고지서 등록", display="block"), Toast
  - Asset.ContentIcon(빈 상태·접근 불가·새 버전 데이터)
- 레이아웃 계약: 골격은 ScreenScaffold로 짠다. 1차 액션은 하단 고정 SubmitFooter다. 구성은 savings-hero → 미결정 목록(Card) → 정리한 고지서 섹션 → AdSlot 순이다.
- 상태
  - 로딩: localStorage 동기 읽기라 스피너가 없다. `useState` 초기화 함수에서 읽는다.
  - 빈 상태: F5-AC-4
  - 에러
    - 손상 데이터 Toast(F5-AC-6)
    - 백업 실패 경고(F5-AC-9)
    - 저장소 접근 불가(F5-AC-10)
    - 새 버전 데이터(F5-AC-11)
- 터치: 카드 전체가 탭 영역이다(높이 64px 이상).
- 스크롤: 최대 50건이라 일반 스크롤을 쓰고 가상 스크롤은 쓰지 않는다.
- Navigation
  - Outgoing
    - "고지서 등록" → `navigate('/notice/new')` (state 없음)
    - 카드 → `navigate(\`/notice/${id}\`)` (state 없음)
  - Incoming: `location.state = { deletedName?: string } | null`
- 계측: `logClick('home_add_notice')`(등록 버튼), `logClick('home_open_notice')`(카드)

### S2. 고지서 등록 — `/notice/new` · S3. 고지서 수정 — `/notice/:id/edit` (같은 컴포넌트)
- Top: 제목 "고지서 등록" / "고지서 수정"
- TDS·템플릿 컴포넌트 (위에서 아래 순서)
  - ScreenScaffold
  - TextField "고지서 이름"(placeholder "예: 강남 주정차"). 네이티브 `maxLength` 속성은 쓰지 않는다. UTF-16 기준이라 이모지를 2자로 세기 때문이다. 대신 `countChars` 기준으로 검증한다(F2-AC-12)
  - Chip + ChipItem "과태료"/"범칙금"(단일 선택, 기본 "과태료")
  - TextField "원래 금액"(inputMode numeric, 천 단위 콤마, `parseAmountInput`으로 소수점·음수 거부)
  - TextField "고지서에 적힌 감경 금액 (선택)"(과태료만, 같은 입력 규칙)
  - TextField type="date" "고지서 받은 날"(기본값 오늘)
  - TextField type="date" "의견제출 기한"(과태료만, 도움말 "감경 마감일이에요. 고지서의 '의견제출 기한'을 그대로 적어주세요")
  - TextField type="date" "납부기한 (선택)" / "1차 납부기한 (선택)"
  - Paragraph.Text(도움말)
  - SubmitFooter + Button("저장", display="block")
  - AlertDialog
    - 기록 초기화 확인(수정 모드만, F2-AC-9)
    - 이전 데이터 삭제 확인(F2-AC-15)
  - Toast
- 키보드: 금액은 숫자 키패드다. 다음 필드로 넘어갈 때 `enterKeyHint="next"`를 쓴다. 포커스된 필드는 `scrollIntoView({ block: 'center' })`로 화면 안에 들어온다. SubmitFooter는 키보드 위에 유지된다.
- 상태
  - 수정 모드에서 없는 id면 빈 상태(F2-AC-5)
  - 저장소 접근 불가면 접근 불가 상태(F2-AC-16)
  - 새 버전 데이터면 수정 모드는 차단 상태, 신규 모드는 저장 시 Toast(F2-AC-17)
  - 검증 에러는 각 TextField의 에러 메시지 영역에 모두 동시에 표시하고, 첫 오류 필드로 이동한다(F2-AC-3, AC-4, AC-11~AC-14)
  - 저장 실패는 Toast(F2-AC-6, AC-16, AC-17)
- Navigation
  - Outgoing
    - 저장 성공 → `navigate(\`/notice/${id}\`, { replace: true, state: { justSaved: true } })`
    - Top 뒤로 → `navigate(-1)`
  - Incoming: `location.state = { focus?: 'paymentDeadline' } | null` (수정 모드만)
- 계측: `logClick('notice_save')`(저장 버튼)

### S4. 고지서 결과 — `/notice/:id`
- Top: 제목은 고지서 이름(예: "강남 주정차"). 우측에 "수정" 텍스트 버튼이 있다.
- 결과 계층화
  - **무료 층** `data-testid="free-tier"`: 핵심 답이다. dday-hero(SummaryHero, CountUp)와 compare-card(Card + ListRow 3개 + Badge "N원 절약"), 감경 규칙 안내 Paragraph.Text로 구성된다. 이것만으로 "감경가로 언제까지 얼마"라는 앱의 목적이 달성된다.
  - **잠금 안내** `data-testid="locked-hint"`: `TossRewardAd` 바깥, 게이트 바로 위의 Paragraph.Text다. locked-tier가 렌더되기 전까지만 보인다(F4-AC-9).
  - **잠금 층** `data-testid="locked-tier"`: 과태료는 월별 가산금·중가산금 표(`scenario-row` ×8), Sparkline(`scenario-sparkline`), MiniBar(`scenario-minibar`), 60개월 상한 안내다. 범칙금은 1·2차·즉결심판 날짜 타임라인이다.
  - **코드 구조 규칙**: 무료 층과 locked-hint는 `<TossRewardAd>` **바깥**에 두고, 잠금 층만 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`의 자식으로 둔다. 화면 전체를 감싸지 않는다.
- 그 밖의 컴포넌트
  - Button("납부·결정 기록", display="block")
  - BottomSheet(상태 옵션 ListRow 2~4개)
  - Button("공유하기", 진행 중 `loading`), Button("삭제", 보조 스타일)
  - AlertDialog(삭제 확인), Toast
  - Paragraph.Text(하단 법적 고지)
  - AdSlot(화면 최하단, 잠금 층과 법적 고지 아래. 고정 높이 래퍼 없음)
- 레이아웃 계약 (위에서 아래 순서)
  - free-tier
  - "납부·결정 기록" 버튼
  - locked-hint
  - locked-tier 게이트
  - 공유·삭제 버튼 행(flex 2열)
  - 법적 고지
  - AdSlot
- 상태
  - 로딩 없음(동기 읽기)
  - 없는 id나 손상 데이터는 빈 상태(F3-AC-7)
  - 저장소 접근 불가는 접근 불가 상태(F3-AC-12)
  - 새 버전 데이터는 차단 상태(F3-AC-13)
  - 저장 실패는 Toast(F6-AC-7, AC-9)
  - 공유 실패는 Toast(F3-AC-11)
- 터치: BottomSheet 옵션 ListRow는 높이 56px 이상이다.
- dday-hero 아래 "납부기한 입력" Button(F3-AC-9)도 `navigate(\`/notice/${id}/edit\`, { state: { focus: 'paymentDeadline' } })`로 이동한다.
- Navigation
  - Outgoing
    - "수정" → `navigate(\`/notice/${id}/edit\`)` (state 없음)
    - "납부기한 입력"(잠금 층) → `navigate(\`/notice/${id}/edit\`, { state: { focus: 'paymentDeadline' } })`
    - 삭제 확인 → `navigate('/', { replace: true, state: { deletedName: string } })`
    - 빈 상태·접근 불가·새 버전 데이터 상태의 "홈으로" → `navigate('/', { replace: true })`
  - Incoming: `location.state = { justSaved?: boolean } | null`. id는 `useParams<{ id: string }>()`로 받는다.
- 계측
  - `logImpression('result_free_tier')`(진입당 1회)
  - `logImpression('scenario_locked_tier')`(잠금 층 첫 렌더 1회)
  - `logClick('result_share')` → `shareApp()`
  - `logClick('mark_paid_early')`, `logClick('mark_paid_late')`, `logClick('mark_objected')`
  - `requestReviewOnce()`(paid_early 기록 직후)

### S5. 없는 경로 — `*`
- ScreenScaffold, Top "과태료 감경시계", Asset.ContentIcon, Paragraph.Text "페이지를 찾을 수 없어요", Button "홈으로"
- Outgoing: `navigate('/', { replace: true })`

### S6. 렌더 오류 — ErrorBoundary 대체 화면 (라우트 아님)
- ScreenScaffold, Top "과태료 감경시계", Asset.ContentIcon, Paragraph.Text "일시적인 문제가 생겼어요", Paragraph.Text "다시 시도해도 계속되면 토스 앱을 다시 실행해 주세요", Button "다시 시도"
- 동작: "다시 시도" → `window.location.reload()` (F7-AC-10)

## API Contract
- 해당 없음. 외부 API를 호출하지 않는다. 모든 데이터는 localStorage에 저장한다.
- 로컬 실패는 HTTP 상태 코드가 아니라 저장소 함수 반환값의 `error`로 구분한다: `'quota' | 'limit' | 'unavailable' | 'unbacked' | 'not_found' | 'newer_version' | 'invalid'`

## Assumptions
- 감경률은 질서위반행위규제법 시행령 제5조의 상한인 20%를 기본으로 쓴다. 고지서에 감경 금액이 적혀 있으면 사용자가 그 값을 입력해 덮어쓴다.
- 범칙금 1차 기한의 기본값은 "받은 날 + 10일"이다(도로교통법 제164조 제1항, 첫날 불산입 민법 제157조). 공휴일·토요일 연장(민법 제161조)은 반영하지 않으므로 고지서 기한 입력을 권한다.
- 각 금액 항은 1원 미만을 버린다. 국고·지방 수납 시의 10원 미만 절사 여부는 확인 전이다(Open Questions).
- 금액 입력 범위 1,000~10,000,000원은 법정 기준이 아니라 앱의 입력 오류 방지용 제한이다.
- 받은 날 하한(오늘로부터 5년 전)과 기한 상한(받은 날로부터 1년 뒤)은 법정 기준이 아니다. 오입력과 비정상적으로 큰 D-day를 막기 위한 앱의 입력 제한이다.
- 로드 검증은 오늘 날짜와 무관한 규칙만 쓴다. "받은 날 ≤ 오늘"과 "받은 날 ≥ 오늘 − 5년"은 입력 화면에서만 검사한다. 시간이 지나기만 해도 정상 데이터가 손상으로 판정되는 일을 막기 위해서다. 기한 상한(받은 날 + 1년)은 오늘과 무관하므로 로드 검증에도 쓴다.
- 손상 백업 상한 3개는 법정 기준이 아니라 저장 용량을 지키기 위한 앱의 제한이다.
- 금액 입력에서 소수점(`.`, `．`)과 음수 기호(`-`, `−`, `－`)가 있으면 입력 자체를 거부한다. 그 밖의 문자(콤마·"원"·"만" 등)는 지금처럼 지우고 숫자만 남긴다.
- 이름 글자 수는 유니코드 코드포인트(`Array.from`) 기준이다. 여러 코드포인트로 이루어진 이모지(가족 이모지 등 ZWJ 시퀀스)는 여러 글자로 센다.
- "마감 임박" 배지 기준 D-0~D-3은 법정 기준이 아니라 UI 표시 기준이다.
- 날짜는 기기 로컬 시간 기준이다. 사용자는 한국 시간대에서 쓴다고 가정한다.
- 토스 로그인 정보는 쓰지 않는다. 데이터는 기기 localStorage에만 있어 기기를 바꾸면 사라진다.

## Open Questions
1. 중가산금 경과 기준일: 제24조 제2항의 "매 1개월이 경과할 때마다"를 납부기한 다음 날부터 몇 일째에 첫 1.2%가 붙는 것으로 볼지 정확한 날짜 경계를 확인해야 한다. 현재는 "체납 N개월" 상대 표기만 하고, 개월별 정확한 날짜는 표시하지 않는다.
2. 끝수 처리: 과태료 가산금·감경액에 국고금 관리법 제47조(10원 미만 절사)나 지방자치단체 규정이 적용되는지 확인해야 한다. 적용되면 `floor10`으로 바꿔야 한다.
3. 감경률 예외: 개별 법률이 자진납부 감경을 20%와 다르게 정하거나 배제하는 과태료 유형이 있는지 확인해야 한다. 시행령의 사회적 약자 추가 감경(기초생활수급자·장애인 등)을 입력 항목으로 넣을지도 정해야 한다.
4. 푸시 알림(PRD 기능 5): 앱인토스에서 서버 없이 마감 하루 전 알림을 보낼 수 있는지 확인해야 한다. 불가능하면 MVP는 홈 배지로 대체하고, 외부 알림 서버(Railway)를 따로 설계할지 결정해야 한다.
5. 지자체 주정차 과태료 체납 시 질서위반행위규제법 제24조 외에 「지방행정제재·부과금의 징수 등에 관한 법률」의 가산금 규정이 함께 적용되는지 확인해야 한다(현재는 제24조만 적용).
6. 무인단속에서 범칙금과 과태료 중 하나를 고를 수 있는 고지서(속도위반 등)에 "두 경로 비교"를 넣을지 정해야 한다. 지금은 사용자가 고지서 유형 하나를 고른다.
7. 앱 번들 로드 실패: 토스 앱 WebView에서 앱 번들 자체를 받지 못할 때의 화면(재시도 버튼 등)은 앱 코드가 실행되기 전이라 앱이 정의할 수 없다. 앱인토스 플랫폼이 이 상태를 처리하는지, 콘솔에서 설정할 항목이 있는지 확인해야 한다.
8. 템플릿 동작 확인
   - TossRewardAd가 광고 로드를 기다리는 타임아웃 값(몇 초 뒤 fail-open하는지)을 확인해야 한다.
   - `shareApp()`이 사용자가 공유 시트를 닫았을 때 reject하는지, 그때 오류 `name`이 `'AbortError'`인지 확인해야 한다. 다르면 F3-AC-11의 취소 판별 조건을 실제 값으로 바꾼다.
9. 손상 백업 복원: `fdc:notices:corrupt`는 MVP에서 쓰기 전용이다. 정해야 할 것은 두 가지다.
   - 백업 원문을 사용자가 확인·복원하거나 고객센터 문의에 첨부하는 경로를 만들지
   - 백업 3개가 찬 뒤에는 새 손상 데이터가 늘 "백업하지 못함"(F5-AC-9)이 된다. 오래된 백업을 정리하는 수단을 둘지
10. 새 버전 데이터(F1-AC-19): 이전 번들이 캐시돼 실행되는 경우 "토스 앱을 다시 실행"하면 최신 번들을 받는지 확인해야 한다. 앱인토스의 번들 갱신 방식이 다르면 F2-AC-17, F3-AC-13, F5-AC-11의 안내 문구를 바꾼다.