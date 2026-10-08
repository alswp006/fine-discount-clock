# TASK — 과태료 감경시계 (Fine Discount Clock)

> 기준 문서: 위 SPEC(F1~F7, AC 90개)에 이 문서의 「SPEC 보완 AC」 5개를 더해 **AC는 모두 95개**입니다.
> 작업 순서: 타입 → 데이터 계층 → 상태(파생값·검증·문구) → 화면 → 통합. 외부 API가 없어 템플릿의 "API Routes" Epic은 해당하지 않습니다.
>
> 공통 DoD (모든 Task에 적용)
> - `tsc --noEmit` 통과
> - 기존 테스트 통과
> - HEX 색상 0건
> - 처리한 오류에 `console.error` 0회
>
> 테스트는 템플릿 러너(Vite 기본 구성이면 Vitest + Testing Library)로 실행합니다. 테스트 파일은 대상 모듈 옆에 둡니다.

## 이번 수정: 교차 검증 GAP 반영

| GAP | 해결 | 바뀐 곳 |
|---|---|---|
| 1-① PRD 기능 5(푸시)에 AC 없음 | MVP 범위에서 확정 제외합니다. 홈 배지는 리마인더가 아니라 앱 안 표시로만 정의합니다. PRD 문구는 「착수 전 문서 반영」 P1로 고칩니다 | 착수 전 문서 반영 P1, SPEC Open Questions 4 |
| 1-② PRD에 범칙금 경로 없음 | PRD 목표와 기능 2·3에 범칙금 경로(1·2차 기한, 즉결심판)를 넣습니다 | 착수 전 문서 반영 P3 |
| 2-① `opinionDeadline` null 동작 미정, 2.3과 2.4 불일치 | `calcFineComparison`은 기한을 보지 않고 금액만 계산합니다. 감경 적용 여부는 새 함수 `hasDiscountStage`가 판단합니다. 화면 동작은 F1-AC-22와 F3-AC-14로 정합니다 | Task 2.3, 2.4, 3.2, 4.7 |
| 2-② 납부기한 없이 감경 마감이 지난 경우 기록 금액 N 미정 | 모든 기록 옵션의 N을 `recordValuesFor()` 하나로 계산합니다. `updateStatus`가 저장하는 값과 같은 함수입니다. 이 경우 N은 40,000원입니다(F6-AC-10) | Task 2.4, 2.9, 4.9 |
| 2-③ 범칙금의 아끼는 금액이 홈에만 보임 | 결과 화면 배지 금액을 홈 히어로와 같은 `potentialSaving`으로 통일합니다. 범칙금 배지 문구는 "N원 덜 내요"이고 "감경"·"절약"이라는 말은 쓰지 않습니다(F3-AC-15) | Task 3.2, 4.7, 5.3 |
| 2-④ DoD 개수 불일치 | F1-AC-15 변형은 31개가 아니라 25개, F2-AC-3 문구는 9종이 아니라 7종, F2-AC-4 문구는 8종이 아니라 7종입니다. 개수만 적지 않고 목록을 DoD에 그대로 적습니다 | Task 2.5, 3.3 |
| 5 "이번 주 안에 결정"은 재방문이 전제 | 목표를 "결과 화면에 처음 들어온 그 자리에서 결정"으로 바꿉니다. 재방문을 이끄는 장치는 MVP에 없다고 명시합니다 | 착수 전 문서 반영 P2 |

함께 정리한 미정 동작이 세 가지 있습니다. 2-② 기록 옵션 표를 정하다가 발견했습니다.
- 범칙금 1차 기한이 지나고 2차 기한 전인 경우의 기록 옵션 문구
- 기록에 성공했을 때 상태별 Toast 문구
- `objected` 고지서를 기록할 때 옵션 금액과 저장값이 어긋나는 문제

모두 F6-AC-11에서 정했습니다.

---

## 착수 전 문서 반영 (기획 담당, 코딩 Task 아님)

코딩 Task 1.1을 시작하기 전에 아래 내용을 PRD와 SPEC 원문에 반영합니다. 코딩 에이전트는 이 절을 구현하지 않고, 아래 「SPEC 보완 AC」만 SPEC AC와 똑같이 취급합니다.

### PRD 수정 요청
- **P1. 기능 5(마감 하루 전 푸시)**: "MVP 제외"로 바꿉니다.
  - 근거: 서버가 없고, 토스 푸시 연동 조건을 확인하지 못했습니다(SPEC Open Questions 4).
  - 홈의 "마감 임박" 배지(F5-AC-3)는 앱을 열었을 때만 보이므로 알림을 대신하지 않는다고 적습니다.
  - Open Questions 4가 "서버 없이 가능"으로 풀리면 별도 Epic으로 다시 엽니다.
- **P2. 목표 문구**
  - 기존: "이번 주 안에 감경가로 납부하거나 의견제출"
  - 변경: "고지서를 등록하고 결과 화면에 처음 들어온 그 자리에서, 과태료는 감경가 납부와 의견제출 중 하나를, 범칙금은 1차 기한 안 납부를 정한다. 다시 열었을 때는 D-day 순서로 남은 고지서를 확인한다."
  - 판정 기준은 Value AC F3-AC-1입니다. 재방문을 유도하는 장치가 MVP에 없다는 것을 PRD 제약으로 적습니다.
- **P3. 범칙금 경로**: 목표와 기능 2·3에 범칙금 경로를 넣습니다.
  - "범칙금은 감경과 의견제출이 없다. 1차 납부기한(받은 날 + 10일), 2차 납부기한(+20일, 20% 가산), 그 뒤 즉결심판 청구로 이어진다(도로교통법 제164조·제165조)."
  - 기능 3의 범칙금 시나리오는 "월별 가산금" 대신 "날짜 타임라인"이라고 적습니다.
- **P4. (참고)** SPEC F6(기록과 누적 절약액)을 PRD 기능 목록에 추가합니다.

### SPEC 수정 요청
- Open Questions 4에 "MVP 제외 확정(PRD P1)"을 적습니다.
- F1 함수 목록에 두 함수를 추가합니다.
  - `hasDiscountStage(n): boolean` = `n.kind === 'fine' && n.opinionDeadline !== null`
  - `recordValuesFor(n, status, today): { paidAmount; savedAmount; decidedAt }`
- F3-AC-5의 "감경 관련 문구는 표시되지 않는다"를 고칩니다: "free-tier 안에 '감경'·'절약' 텍스트 0건. 아끼는 금액은 F3-AC-15의 '덜 내요' 배지로만 표시한다."
- 아래 보완 AC 5개를 추가합니다.

### SPEC 보완 AC (5개)

- **F1-AC-22 [U][P0]: 감경 단계가 없는 과태료 (`opinionDeadline` null)**
  - Given today `'2026-10-09'`, 과태료 N0 = `{ amount: 40000, discountedAmount: null, receivedDate: '2026-10-05', opinionDeadline: null, paymentDeadline: '2026-11-30', status: 'open' }`
  - Then `hasDiscountStage(N0) = false`
  - And `getKeyDeadline` = `{ label: '납부기한', date: '2026-11-30', dday: 52 }`
  - And `currentDueAmount = 40000`, `potentialSaving = 1200`
  - And `calcFineComparison(N0)`은 기한을 보지 않으므로 `{ discounted: 32000, full: 40000, overdueFirst: 41200, saving: 8000 }` 그대로입니다. 이 값을 지금 낼 금액에 쓰지 않습니다.
  - And N0에 `discountedAmount: 30000`이 있어도 `currentDueAmount`는 40000입니다.
  - And today `'2026-12-01'`이면 다음과 같습니다.
    - `getKeyDeadline`은 null
    - `getLastDeadline`은 `{ label: '납부기한', date: '2026-11-30', dday: -1 }`
    - `currentDueAmount = 41200`, `potentialSaving = 0`
  - And 범칙금은 언제나 `hasDiscountStage = false`입니다.

- **F3-AC-14 [S][P1]: 감경 단계가 없는 과태료의 결과 화면**
  - Given F1-AC-22의 N0(이름 '시청 앞 주정차'), today `'2026-10-09'`
  - Then dday-hero는 "납부기한까지 D-52 · 2026.11.30(월)"입니다.
  - And compare-card는 ListRow 3개입니다.
    - 감경 납부액 행: "의견제출 기한이 없어 감경 납부액을 표시하지 않아요", 비활성 색 `var(--adaptiveGrey400)`
    - "지금 내면 40,000원": 강조, Badge "1,200원 덜 내요"
    - "납부기한까지 안 내면 41,200원부터"
  - And Badge "N원 절약"은 0개이고, 감경 규칙 안내("감경은 의견제출 기한 안에…")도 0개입니다.
  - And compare-card 아래에 Paragraph.Text "고지서에 의견제출 기한이 적혀 있으면 '수정'에서 입력해 주세요"가 표시됩니다.
  - And 홈 카드는 "납부기한 · D-52"와 "40,000원"을 표시하고, 히어로 합계에 1,200원이 들어갑니다.

- **F3-AC-15 [S][P0]: 아끼는 금액 배지는 홈 히어로와 같은 값을 쓴다**
  - Given open 고지서 n, today
  - Then 결과 화면의 배지 금액은 `potentialSaving(n, today)`이고, 0이면 배지를 렌더하지 않습니다.
    - 과태료이고 `hasDiscountStage`이며 감경 마감 전: 감경 납부액 행에 "N원 절약"(기존 F3-AC-1·3)
    - 그 밖의 과태료: "지금 내면 …" 행에 "N원 덜 내요"
    - 범칙금: 1차 기한 행에 "N원 덜 내요"
  - And F3-AC-5의 범칙금(40,000원, today `'2026-10-09'`)은 "1차 기한 안에 40,000원" 행에 Badge "8,000원 덜 내요"를 표시합니다. free-tier 안의 "감경"·"절약" 텍스트는 0건입니다.
  - And 같은 범칙금이 today `'2026-10-16'`(1차 기한 지남)이면 Badge는 0개입니다.
  - And F3-AC-4(today `'2026-10-21'`)에서는 "지금 내면 40,000원" 행에 Badge "1,200원 덜 내요"를 표시합니다.
  - And F5-AC-1의 B(범칙금 60,000원)는 홈 히어로에 12,000원으로 들어가고, B의 결과 화면에는 "12,000원 덜 내요"가 보입니다.

- **F6-AC-10 [E][P1]: 납부기한 없이 감경 마감이 지난 과태료의 기록**
  - Given 과태료 `{ name: '강남 주정차', amount: 40000, opinionDeadline: '2026-10-20', paymentDeadline: null }`, today `'2026-10-21'`(F1-AC-11의 둘째 사례, `getKeyDeadline`은 null)
  - When "납부·결정 기록" BottomSheet를 엽니다.
  - Then 옵션은 이 순서로 3개입니다.
    1. "기한 지나서 40,000원 납부했어요"
    2. "의견제출을 했어요"
    3. "아직 결정 안 했어요"
  - And 첫 옵션을 탭하면 다음이 확인됩니다.
    - 저장값: status `'paid_late'`, paidAmount 40000, savedAmount 0, decidedAt `'2026-10-21'`
    - Toast "납부를 기록했어요"
    - `logClick('mark_paid_late')` 1회, `requestReviewOnce()` 0회
  - And 홈 "정리한 고지서" 섹션에 "기한 후 납부 · 40,000원"이 표시됩니다.
  - And 옵션 금액 N은 항상 `recordValuesFor(n, 상태, today).paidAmount`입니다. 따라서 화면에 보이는 금액과 저장되는 paidAmount가 같습니다.

- **F6-AC-11 [E][P1]: 시점별 기록 옵션과 성공 Toast**
  - Given 기록 옵션은 `asOpen = { ...n, status: 'open' }`로 계산합니다. `updateStatus`의 계산 규칙(F1-AC-10)과 같습니다. 첫 옵션은 다음 표를 따릅니다.

    | 조건 (`getKeyDeadline(asOpen, today)`) | 첫 옵션 문구 | status |
    |---|---|---|
    | 과태료, label `'감경 마감'` | "감경가 N원으로 납부했어요" | paid_early |
    | 과태료, label `'납부기한'` | "기한 안에 N원 납부했어요" | paid_early |
    | 범칙금, label `'1차 납부기한'` | "1차 기한 안에 N원 납부했어요" | paid_early |
    | 범칙금, label `'2차 납부기한'` | "2차 기한 안에 N원 납부했어요" | paid_early |
    | null | "기한 지나서 N원 납부했어요" | paid_late |

  - And 범칙금 `{ amount: 40000, receivedDate: '2026-10-05', paymentDeadline: null }`, today `'2026-10-16'`이면 첫 옵션은 "2차 기한 안에 48,000원 납부했어요"이고, 탭하면 paid_early/48000/0으로 저장됩니다.
  - And 성공 Toast와 로그는 다음과 같습니다.

    | 기록 | 성공 Toast | 로그 |
    |---|---|---|
    | paid_early, 첫 옵션 라벨이 `'감경 마감'` 행 | "감경 납부를 기록했어요. N원 아꼈어요" (N = savedAmount) | `logClick('mark_paid_early')`, `requestReviewOnce()` 1회 |
    | 그 밖의 paid_early, savedAmount > 0 | "납부를 기록했어요. N원 아꼈어요" | 같음 |
    | paid_early, savedAmount 0 | "납부를 기록했어요" | 같음 |
    | paid_late | "납부를 기록했어요" | `logClick('mark_paid_late')`. 리뷰 요청 0회 |
    | objected | "의견제출을 기록했어요" | `logClick('mark_objected')`. 리뷰 요청 0회 |
    | open | "기록을 되돌렸어요" | logClick 0회, 리뷰 요청 0회 |

  - And objected 고지서를 today `'2026-10-09'`(감경 마감 `'2026-10-20'` 전)에 열면 첫 옵션은 "감경가 32,000원으로 납부했어요"입니다. `updateStatus`가 저장하는 paidAmount도 32000입니다.

---

## 이전 수정: 파일 소유 규칙 (유지)

**모든 파일은 정확히 한 Task만 만들거나 수정합니다.** SPEC 모듈 경로(`fineEngine.ts`, `noticeSchema.ts`, `noticeStore.ts`)는 하위 파일을 다시 내보내는 barrel 파일입니다. 해당 그룹의 마지막 Task가 한 번만 만듭니다.

| 충돌 파일 | 해결 |
|---|---|
| `src/lib/noticeSchema.ts` | `schema/schemaConstants.ts`(1.2), `schema/validateNotices.ts`(2.5), `schema/versioning.ts`·`schema/corruptBackup.ts`(2.6). barrel은 2.6이 만듭니다 |
| `src/lib/fineEngine.ts` | `engine/amounts.ts`(2.3), `engine/deadlines.ts`(2.4). barrel은 2.4가 만듭니다 |
| `src/lib/noticeStore.ts` | `store/storageCore.ts`·`store/loadNotices.ts`(2.7), `store/saveNotice.ts`(2.8), `store/mutateNotice.ts`(2.9). barrel은 2.9가 만듭니다 |
| `src/pages/HomePage.tsx` | 4.2는 컴포넌트만 만들고, 페이지는 4.3이 만듭니다 |
| 등록·수정 페이지 | 공용 폼은 4.4, 제출 훅과 `NoticeCreatePage`는 4.5, `NoticeEditPage`는 4.6이 만듭니다 |
| `src/pages/NoticeResultPage.tsx` | 4.7~4.9는 컴포넌트만 만들고, 조립은 4.10이 합니다 |
| `FreeTier.tsx` | 납부처 문구는 `LegalNotice.tsx`(4.7)에 둡니다. 5.2는 검사만 합니다 |

---

## Epic 1. 타입 & 상수

**리스크**
- 복잡도: Low
- 리스크 요인
  - 필드명이나 오류 코드 유니온이 SPEC과 어긋나면 이후 Task를 연쇄로 고쳐야 합니다.
  - RouteState가 빠지면 페이지마다 `location.state` 형태가 달라질 수 있습니다.
- 완화
  - 런타임 코드가 없는 타입 Task를 맨 앞에 둡니다.
  - 오류 코드 7개와 RouteState는 SPEC 정의를 그대로 옮깁니다.

### Task 1.1 엔티티·결과·RouteState 타입 정의
- Description: SPEC Data Models를 `src/lib/types.ts`에 옮깁니다. 런타임 코드는 넣지 않습니다.
  - 엔티티: `NoticeKind`, `NoticeStatus`, `Notice`, `NoticeInput`
  - 계산 결과
    - `KeyDeadline`, `FineComparison`, `FineScenarioRow`, `PenaltyStages`
    - **추가** `RecordValues = { paidAmount: number | null; savedAmount: number; decidedAt: string | null }`
  - 로드·입력: `LoadResult`, `AmountParse`
  - 저장소 계약: `NoticesData`, `CorruptBackup`, `NoticeMigrations`
  - 오류 유니온
    - `SaveError = 'quota'|'limit'|'unavailable'|'unbacked'|'newer_version'|'invalid'`
    - `UpdateError = 'quota'|'not_found'|'unavailable'|'newer_version'|'invalid'`
    - `DeleteError = 'quota'|'not_found'|'unavailable'|'newer_version'`
  - 반환·옵션 타입: `SaveResult`, `UpdateResult`, `DeleteResult`, `SaveOptions = { resetRecord?: boolean; discardCorrupt?: boolean }`
  - 폼 필드 키: `FormField = 'name'|'amount'|'discountedAmount'|'receivedDate'|'opinionDeadline'|'paymentDeadline'`
  - **RouteState**
    ```ts
    export type RouteState = {
      '/': { deletedName?: string } | null;
      '/notice/new': null;
      '/notice/:id/edit': { focus?: 'paymentDeadline' } | null;
      '/notice/:id': { justSaved?: boolean } | null;
    };
    ```
- DoD
  - `types.ts`에 `function`·`const`·`class` 선언이 0개입니다.
  - `Notice` 필드 14개의 이름과 타입이 SPEC과 같습니다.
  - `LoadResult`에 `newerVersion: boolean`이 있습니다.
  - `RecordValues` 필드 3개의 타입이 위 정의와 같습니다.
  - `RouteState`의 키 4개와 값 타입이 위 코드와 같고, 모든 값 타입에 `| null`이 있습니다.
- Covers: 직접 AC 없음 (F1~F6 전체의 타입 계약)
- Files: `src/lib/types.ts`
- Depends on: none

### Task 1.2 법령 기준 상수 & 스키마 상수
- Description
  - `src/lib/fineRules.ts`: SPEC의 `FINE_RULES`, `PENALTY_RULES`, `INPUT_LIMITS`를 출처 주석과 함께 옮깁니다.
  - `src/lib/schema/schemaConstants.ts`에 다음 값을 둡니다.
    - `CURRENT_SCHEMA_VERSION = 1`
    - `STORAGE_LIMITS = { MAX_CORRUPT_BACKUPS: 3 }`
    - `MIGRATIONS: NoticeMigrations = {}`
    - `NOTICES_KEY = 'fdc:notices:v1'`, `CORRUPT_KEY = 'fdc:notices:corrupt'`
- DoD
  - 상수 값이 SPEC과 같습니다: 20, 3, 12, 60, 10, 20, 20, 그리고 INPUT_LIMITS 6개.
  - 법령 상수마다 조문 주석이 있습니다.
  - `INPUT_LIMITS`와 `STORAGE_LIMITS`에는 "법정 기준 아님" 주석이 있습니다.
  - 모든 상수가 `as const`입니다.
- Covers: 직접 AC 없음 (F1-AC-1~6, 19~21의 기준값)
- Files: `src/lib/fineRules.ts`, `src/lib/schema/schemaConstants.ts`
- Depends on: Task 1.1

---

## Epic 2. 데이터 계층 (순수 함수 → 스키마 → 저장소)

**리스크**
- 복잡도: High. 손상·새 버전·접근 불가·용량 초과 4갈래 분기와 백업 규칙이 겹칩니다.
- 리스크 요인
  - `new Date('YYYY-MM-DD')`는 UTC로 해석되어 D-day가 하루 밀릴 수 있습니다.
  - 오늘 날짜에 따라 바뀌는 규칙이 로드 검증에 섞이면, 시간만 지나도 정상 데이터가 손상으로 판정됩니다.
  - 저장 함수가 throw하면 화면이 크래시합니다.
  - 새 버전 데이터를 손상으로 보고 덮어쓰거나, 백업 키를 덮어쓸 수 있습니다.
  - **감경 적용 여부를 함수마다 따로 판단하면** 홈·결과·기록 화면의 금액이 서로 어긋납니다(GAP 2-①·②).
- 완화
  - 순수 함수를 먼저 만들고, 저장소 Task는 이 함수들을 조합만 합니다.
  - `localStorage` 접근은 `storageCore.ts`의 try/catch로 모읍니다.
  - 백업 키 쓰기는 `loadNotices`에만 둡니다.
  - 감경 적용 여부는 `hasDiscountStage` 하나로, 기록값은 `recordValuesFor` 하나로 계산합니다.

### Task 2.1 입력 해석 순수 함수 (`inputRules.ts`)
- Description: `parseAmountInput`, `countChars`, `addYears`, `isValidYmd`를 구현합니다.
  - `parseAmountInput`은 다음 순서로 판정합니다.
    1. 음수 기호(`-`, `−` U+2212, `－` U+FF0D)가 있으면 `negative`
    2. 소수점(`.`, `．` U+FF0E)이 있으면 `decimal`
    3. 그 밖에는 숫자만 남긴 `digits`
  - `countChars` = `Array.from(s.trim()).length`
  - `addYears`는 같은 월·일을 쓰고, 그 날이 없으면 그 달 말일을 씁니다.
  - `isValidYmd`는 정규식으로 형식을 확인한 뒤, 월 1~12와 그 달의 실제 일수(윤년 반영)를 검사합니다.
- DoD
  - F1-AC-14 예시 16개가 모두 기대값과 같습니다. 구성은 `parseAmountInput` 9개 + `'．'` 1개, `countChars` 3개, `addYears` 3개이고, 예시 1개가 테스트 1건입니다.
  - F1-AC-16 `isValidYmd` 예시 11개가 모두 기대값과 같습니다.
  - `addYears`·`isValidYmd`에서 `Date` 객체 사용이 0건입니다.
- Covers: F1-AC-14, F1-AC-16(형식 판정부)
- Files: `src/lib/inputRules.ts`, `src/lib/inputRules.test.ts`
- Depends on: Task 1.2

### Task 2.2 날짜 산술·표시 포맷 유틸 (`dateUtils.ts`)
- Description
  - 날짜 산술: `ymdToDayNumber`(`Date.UTC` 기반 정수 일수), `addDays(ymd, n)`, `diffDays(a, b)`
  - `todayYmd()`: 기기 로컬 `getFullYear/getMonth/getDate`로 만듭니다.
  - 날짜 표시: `formatYmdKo`(→ `'2026.10.20(화)'`), `formatYmdDot`(→ `'2026.11.04'`)
  - D-day 표시: `formatDday` (0 → `'D-DAY'`, n → `'D-n'`, −n → `'D+n'`)
  - 금액 표시: `formatWon` (`toLocaleString('ko-KR') + '원'`)
- DoD
  - 날짜 산술
    - `addDays('2026-10-05', 10)` = `'2026-10-15'`
    - `addDays('2026-10-15', 20)` = `'2026-11-04'`
    - `diffDays('2026-10-20', '2026-10-09')` = 11
    - `diffDays('2026-11-30', '2026-10-09')` = 52
  - 요일: `formatYmdKo`가 `'2026-10-20'`(화), `'2026-11-30'`(월), `'2026-10-15'`(목), `'2026-11-04'`(수)를 맞게 표시합니다.
  - `formatDday`: 0 → `'D-DAY'`, 11 → `'D-11'`, −1 → `'D+1'`
  - `formatWon(32000)` = `'32,000원'`
  - `new Date('YYYY-MM-DD')` 문자열 파싱이 0건입니다.
- Covers: 직접 AC 없음 (F1-AC-4·5, F3 표기의 전제)
- Files: `src/lib/dateUtils.ts`, `src/lib/dateUtils.test.ts`
- Depends on: Task 1.1

### Task 2.3 계산 엔진 1 — 금액·시나리오·범칙금 단계 (`engine/amounts.ts`)
- Description
  - `calcDday(date, today)` = `diffDays(date, today)`
  - `calcFineComparison(n)`
    - **이 함수는 금액만 계산합니다.** `opinionDeadline`·`paymentDeadline`·status·today를 읽지 않습니다.
    - 감경을 적용할지는 Task 2.4의 `hasDiscountStage`·`currentDueAmount`가 판단합니다. 이 점을 함수 주석에 적습니다.
    - `discounted = discountedAmount ?? floor(amount*80/100)`
    - `overdueFirst = amount + floor(amount*3/100)`
    - `saving = full − discounted`
  - `calcFineScenario(amount, maxMonth=60)`
    - month m의 surcharge = `floor(amount*3/100) + floor(amount*12/1000) * min(m, 60)`
  - `calcPenaltyStages(n)`
    - `first = paymentDeadline ?? addDays(receivedDate, 10)`
    - `second = addDays(first, 20)`
    - `secondAmount = amount + floor(amount*20/100)`
  - 비율은 모두 `fineRules.ts` 상수에서 가져옵니다.
- DoD
  - F1-AC-1
    - 40000 → `{32000, 40000, 41200, 8000}`
    - 33333 → discounted 26666, overdueFirst 34332
  - F1-AC-2: discountedAmount 30000 → saving 10000
  - F1-AC-22(금액부): N0(opinionDeadline null)도 `{32000, 40000, 41200, 8000}`입니다. 두 기한을 모두 null로 바꿔도 결과가 같습니다.
  - F1-AC-3: `calcFineScenario(40000, 61)`
    - month 0/1/12/60/61 = 41200/41680/46960/70000/70000
    - month 60의 surcharge = 30000
    - 배열 길이 = 62
  - F1-AC-4: 두 사례가 모두 일치합니다.
  - F1-AC-5: `calcDday` 3개 값이 11, 0, −1입니다.
  - 본문에 비율 숫자 리터럴 20·3·12·60·10이 0건입니다.
  - `calcFineComparison` 본문에서 `Deadline`·`status` 식별자 참조가 0건입니다.
- Covers: F1-AC-1, F1-AC-2, F1-AC-3, F1-AC-4, F1-AC-5(calcDday), F1-AC-22(금액부)
- Files: `src/lib/engine/amounts.ts`, `src/lib/engine/amounts.test.ts`
- Depends on: Task 1.2, Task 2.2

### Task 2.4 계산 엔진 2 — 감경 단계·기준 기한·지금 낼 금액·기록값 + `fineEngine.ts` barrel
- Description: `src/lib/engine/deadlines.ts`에 다음 함수를 둡니다.
  - **`hasDiscountStage(n)`** = `n.kind === 'fine' && n.opinionDeadline !== null`
    - 감경을 적용할지 판단하는 유일한 함수입니다.
    - Task 2.4의 다른 함수, Task 3.2, Task 4.7, Task 4.9는 이 함수만 씁니다.
  - `getKeyDeadline`: 오늘 이후(당일 포함) 기한 중 가장 이른 것을 돌려줍니다. 모두 지났으면 null입니다.
    - 과태료: 감경 마감(`hasDiscountStage`이고 status가 `objected`가 아닐 때만), 납부기한
    - 범칙금: 1차·2차 납부기한
  - `getLastDeadline`
    - 과태료: `paymentDeadline ?? opinionDeadline`, 라벨은 `'납부기한'` 또는 `'감경 마감'`
    - 범칙금: 2차 납부기한
  - `currentDueAmount`·`potentialSaving`은 F1-AC-6, F1-AC-11, F1-AC-22의 구간표를 따릅니다.
    - 감경 금액(`calcFineComparison().discounted`)은 `hasDiscountStage`이고, status가 `objected`가 아니며, today ≤ opinionDeadline일 때만 씁니다.
    - `paid_*` 상태이면 `currentDueAmount = paidAmount`입니다.
    - `open`이 아니면 `potentialSaving = 0`입니다.
  - **`recordValuesFor(n, status, today): RecordValues`**
    - `asOpen = { ...n, status: 'open' }`으로 F1-AC-10의 표를 계산합니다.
      - paid_early: `{ currentDueAmount(asOpen), potentialSaving(asOpen), today }`
      - paid_late: `{ currentDueAmount(asOpen), 0, today }`
      - objected: `{ null, 0, today }`
      - open: `{ null, 0, null }`
    - Task 2.9 `updateStatus`와 Task 4.9 옵션 문구가 같은 값을 쓰도록 하는 유일한 함수입니다.
  - `src/lib/fineEngine.ts`: `engine/amounts`와 `engine/deadlines`를 다시 내보냅니다. SPEC 모듈 경로는 이 파일입니다.
- DoD
  - F1-AC-5
    - today `'2026-10-20'` → `{label:'감경 마감', dday:0}`
    - today `'2026-10-21'` → `{label:'납부기한', date:'2026-11-30', dday:40}`
  - F1-AC-6: 4구간 값이 32000/8000, 40000/1200, 60000/12000, 72000/0입니다.
  - F1-AC-11
    - 과태료 3사례와 범칙금 1사례의 4개 함수 결과가 모두 일치합니다.
    - `paid_early`이면 `currentDueAmount`가 paidAmount입니다.
    - `objected`는 납부기한 전 40000, 납부기한 후 41200입니다.
    - `open`이 아니면 `potentialSaving`이 0입니다.
  - F1-AC-22
    - `hasDiscountStage(N0)` = false, 범칙금 = false, F1-AC-5 과태료 = true
    - N0(today `'2026-10-09'`): `getKeyDeadline` = `{납부기한, '2026-11-30', 52}`, 지금 낼 금액 40000, 아낄 금액 1200
    - N0에 discountedAmount 30000을 넣어도 지금 낼 금액은 40000
    - N0(today `'2026-12-01'`): key null, last `{납부기한, '2026-11-30', -1}`, 41200/0
  - `recordValuesFor`
    - F6-AC-1 사례 paid_early → `{32000, 8000, '2026-10-09'}`
    - F6-AC-6 과태료 → `{40000, 1200}`, 범칙금 → `{40000, 8000}`
    - F6-AC-8 paid_late → `{41200, 0, '2026-12-01'}`
    - F6-AC-10 paid_late → `{40000, 0, '2026-10-21'}`
    - F6-AC-11 범칙금(today `'2026-10-16'`) paid_early → `{48000, 0}`
    - F6-AC-11 objected 고지서(today `'2026-10-09'`) paid_early → `{32000, 8000}`
    - open → `{null, 0, null}`
  - `deadlines.ts` 안에서 `opinionDeadline !== null`·`opinionDeadline == null` 비교는 `hasDiscountStage` 본문에만 있습니다(grep 1건). 단, `getLastDeadline`의 `??`는 예외입니다.
  - `import { calcFineComparison, getKeyDeadline, hasDiscountStage, recordValuesFor } from './fineEngine'`이 컴파일됩니다.
- Covers: F1-AC-5, F1-AC-6, F1-AC-11, F1-AC-22, F6-AC-10·11(금액 계산부)
- Files: `src/lib/engine/deadlines.ts`, `src/lib/engine/deadlines.test.ts`, `src/lib/fineEngine.ts`
- Depends on: Task 2.3, Task 2.2

### Task 2.5 스키마 검증 (`schema/validateNotices.ts`)
- Description: SPEC "로드 검증 규칙"을 전부 구현합니다.
  - 컬렉션: 최상위가 객체, notices가 배열, 길이 ≤ 50, id 중복 없음
  - 항목 형식
    - 날짜: `isValidYmd`
    - 타임스탬프: ISO 정규식 + `Date.parse`
    - 이름: `countChars`
  - 불변식
    - 과태료는 기한이 하나 이상 있습니다.
    - 범칙금 제약을 지킵니다.
    - 기한은 받은 날 이상, `addYears(받은 날, 1)` 이하입니다.
    - 두 기한이 역전되지 않습니다.
    - 상태별 기록값 표를 지킵니다.
  - 오늘 날짜에 의존하는 규칙은 넣지 않습니다. `version` 판정은 하지 않습니다(Task 2.6 담당).
  - 상수는 `./schemaConstants`, `../fineRules`에서 직접 가져옵니다.
- DoD
  - F1-AC-15
    - 기준 항목 B는 통과하고 `[B]`를 반환합니다.
    - 아래 변형 **25개**는 모두 null입니다. 1행이 테스트 1건이고 `it.each`로 둡니다.
      1. 두 기한 모두 null
      2. opinionDeadline `'2026-11-30'` + paymentDeadline `'2026-11-01'`
      3. opinionDeadline `'2026-10-01'`
      4. paymentDeadline `'2027-10-06'`
      5. penalty + opinionDeadline `'2026-10-20'`
      6. penalty + discountedAmount 30000
      7. penalty + status `'objected'`
      8. open + decidedAt `'2026-10-09'`
      9. open + paidAmount 32000
      10. open + savedAmount 8000
      11. paid_early + decidedAt null
      12. paid_early + paidAmount null
      13. paid_late + savedAmount 1200
      14. objected + paidAmount 40000
      15. amount 999
      16. amount 10000001
      17. amount 40000.5
      18. discountedAmount 40000
      19. discountedAmount 0
      20. savedAmount −1
      21. name `''`
      22. name `'   '`
      23. name `' 강남'`
      24. name `'🚗'×21`
      25. id `''`
    - 2019년 날짜의 B는 통과합니다.
    - F1-AC-22의 N0(opinionDeadline null, paymentDeadline 있음)을 B 형식으로 만든 항목은 통과합니다.
  - F1-AC-16: B 변형 7개가 모두 null입니다.
    - receivedDate `'2026-02-30'`
    - receivedDate `'abc'`
    - opinionDeadline `'2026-13-01'`
    - paymentDeadline `'2026/11/30'`
    - objected + decidedAt `'2026-02-29'`
    - createdAt `'yesterday'`
    - updatedAt `'2026-10-09'`
  - F1-AC-17: 유효 51개 → null, 50개 → 50건, id `'a1'` 중복 → null
  - F1-AC-9: `notices:{}`, 최상위 `[]`, amount 누락 항목 → null
  - `undefined`·숫자·문자열 입력에도 throw하지 않고 null을 반환합니다.
- Covers: F1-AC-9(검증부), F1-AC-15(검증부), F1-AC-16(데이터 검증부), F1-AC-17(검증부)
- Files: `src/lib/schema/validateNotices.ts`, `src/lib/schema/validateNotices.test.ts`
- Depends on: Task 1.2, Task 2.1

### Task 2.6 버전 판정·마이그레이션·백업 해석 + `noticeSchema.ts` barrel
- Description
  - `schema/versioning.ts`
    - `classifyStoredData(parsed)`: `{kind:'corrupt'} | {kind:'newer'} | {kind:'ok'; notices}`
      - version이 없거나, 정수가 아니거나, 1 미만 → corrupt
      - `> CURRENT` → newer
      - `< CURRENT` → migrate한 뒤 validate
      - `== CURRENT` → validate
    - `migrateNoticesData(data, from, migrations = MIGRATIONS, to = CURRENT_SCHEMA_VERSION)`
      - 한 단계씩 적용합니다.
      - 단계가 없거나 예외가 나면 null을 반환합니다.
      - `from === to`이면 그대로 반환합니다.
  - `schema/corruptBackup.ts`: `parseCorruptBackup(raw)`는 SPEC "백업 키 규칙"의 4가지 해석을 따릅니다.
  - `src/lib/noticeSchema.ts`: 다음을 다시 내보냅니다.
    - `schemaConstants`
    - `validateNotices`
    - `versioning`·`corruptBackup`
    - 타입 `NoticesData`·`CorruptBackup`·`NoticeMigrations`
- DoD
  - F1-AC-20의 5사례가 일치합니다.
  - F1-AC-19: `{"version":2,…}` → newer
  - F1-AC-9·19: version 0, `'1'`, `'2'`, 1.5, 2.5, 없음 → corrupt
  - `parseCorruptBackup`
    - null → `{kind:'ok', backups:[]}`
    - 정상 v1 → 그 목록
    - `{"version":2,"backups":[]}` → `{kind:'newer'}`
    - `'{older'` → `[{raw:'{older'}]`
    - 항목이 4개 이상인 v1 → 문자열 전체를 항목 1개로 봅니다.
- Covers: F1-AC-9(버전 판정부), F1-AC-19(판정부), F1-AC-20, F1-AC-21(해석부)
- Files: `src/lib/schema/versioning.ts`, `src/lib/schema/versioning.test.ts`, `src/lib/schema/corruptBackup.ts`, `src/lib/schema/corruptBackup.test.ts`, `src/lib/noticeSchema.ts`
- Depends on: Task 2.5

### Task 2.7 저장소 1 — 예외 분류·안전 접근·`loadNotices`
- Description
  - `store/storageCore.ts`
    - `classifyStorageError(e)`: `DOMException`이면서 name이 `QuotaExceededError`·`NS_ERROR_DOM_QUOTA_REACHED`이거나 code가 22·1014이면 `'quota'`, 그 밖은 `'unavailable'`입니다.
    - `safeGet(key)`, `safeSet(key, value)`: throw하지 않고 결과 객체를 반환합니다.
    - `readNoticesState()`: 부수효과 없이 `unavailable | newer | corrupt(raw) | ok(notices)` 중 하나를 반환합니다.
  - `store/loadNotices.ts`
    - corrupt 결과를 받으면 백업 추가 규칙을 적용합니다.
      - 같은 raw가 이미 있으면 쓰지 않습니다.
      - 백업이 3개 미만이면 추가합니다.
      - 3개이거나 newer이면 `backupFailed`입니다. 쓰기 예외도 `backupFailed`입니다.
    - 플래그 우선순위는 unavailable → newerVersion → corrupted입니다.
  - 어떤 경로에서도 throw하지 않고 `console.error`를 호출하지 않습니다.
- DoD (localStorage 모킹)
  - F1-AC-7: 키가 없으면 플래그 5개가 모두 false이고 `notices: []`입니다.
  - F1-AC-8
    - `'{bad'` → `corrupted: true`, `backupFailed: false`
    - corrupt 키가 `{"version":1,"backups":[{"raw":"{bad"}]}`가 됩니다.
    - 같은 원문이 이미 있으면 다시 쓰지 않습니다(0회).
  - F1-AC-9
    - 스키마 오류 7종이 모두 corrupted이고 백업에 추가됩니다.
    - 백업 `setItem`이 Quota 예외를 던지면 `backupFailed: true`이고 throw하지 않습니다.
  - F1-AC-12
    - `getItem`이 SecurityError를 던지면 `unavailable: true`, 백업 쓰기 시도 0회, `console.error` 0회입니다.
    - code 22, code 1014, `NS_ERROR_DOM_QUOTA_REACHED`는 `'quota'`로 분류됩니다.
  - F1-AC-17: 51건이거나 id가 중복되면 corrupted입니다.
  - F1-AC-19: version 2 → `newerVersion: true`, 백업 쓰기 0회
  - F1-AC-21
    - 기존 백업 1개 → 뒤에 추가합니다.
    - 3개가 차 있으면 쓰지 않고 `backupFailed: true`입니다.
    - 맨 문자열이면 첫 항목으로 보존합니다.
    - v2 백업이면 쓰지 않고 `backupFailed: true`입니다.
- Covers: F1-AC-7(로드), F1-AC-8(로드·백업), F1-AC-9, F1-AC-12(로드·분류), F1-AC-17, F1-AC-19(로드), F1-AC-21
- Files: `src/lib/store/storageCore.ts`, `src/lib/store/loadNotices.ts`, `src/lib/store/loadNotices.test.ts`
- Depends on: Task 2.6

### Task 2.8 저장소 2 — `saveNotice` (`store/saveNotice.ts`)
- Description
  - 판정 순서
    1. 읽기 예외 → `unavailable`
    2. 새 버전 → `newer_version` (`discardCorrupt`로도 풀리지 않음)
    3. 손상이고, 백업에 같은 raw가 없고, `discardCorrupt`가 아님 → `unbacked`. 백업 여부는 `parseCorruptBackup`로 읽기만 해서 판정합니다.
    4. 신규 저장인데 이미 50건 → `limit`
    5. `validateNotices` 실패 → `invalid`
    6. 쓰기 예외 → `classifyStorageError`
  - 손상 상태에서는 기존 목록을 `[]`로 봅니다.
  - 신규 저장
    - id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    - status `'open'`, 기록값 null/0/null
    - `createdAt = updatedAt = new Date().toISOString()`
  - 수정 저장: 기록값과 createdAt은 그대로 두고 updatedAt만 갱신합니다. `resetRecord`이면 기록값을 초기화합니다.
  - name은 trim해서 저장합니다.
  - 백업 키에는 쓰지 않습니다.
- DoD (가짜 타이머)
  - F1-AC-7: 저장한 뒤 다시 로드하면 name `'강남 주정차'`, status `'open'`, savedAmount 0이고, 원문 형식이 `{"version":1,"notices":[…]}`입니다.
  - F1-AC-8: Quota 예외 → `'quota'`, 원문 그대로. 50건 상태 → `'limit'`
  - F1-AC-12: SecurityError → `'unavailable'`
  - F1-AC-13의 6사례
    - 백업이 없음 → `'unbacked'`, `'{bad'` 그대로
    - `discardCorrupt` → 저장되어 `{version:1, notices:[1건]}`
    - 백업에 `'{older'`만 있음 → `'unbacked'`
    - 백업이 newer → `'unbacked'`
    - 백업에 같은 원문이 있음 → 바로 저장
    - 저장소가 비었거나 유효함 → `'unbacked'`가 나오지 않음
  - F1-AC-15: 과태료이고 두 기한이 모두 null → `'invalid'`, 원문 그대로
  - F1-AC-22(저장): opinionDeadline null + paymentDeadline `'2026-11-30'`인 과태료는 `ok: true`로 저장됩니다.
  - F1-AC-18: 신규·수정 타임스탬프 규칙을 지키고, 실패한 호출 뒤에는 타임스탬프가 바뀌지 않습니다.
  - F1-AC-19: 일반 저장과 `discardCorrupt` 저장 모두 `'newer_version'`이고 원문 그대로입니다.
  - 백업 키 `setItem`/`removeItem` 호출이 0회입니다.
- Covers: F1-AC-7(저장), F1-AC-8(quota·limit·백업 키 불변), F1-AC-12(저장), F1-AC-13, F1-AC-15(저장 검증), F1-AC-18(저장), F1-AC-19(저장)
- Files: `src/lib/store/saveNotice.ts`, `src/lib/store/saveNotice.test.ts`
- Depends on: Task 2.7

### Task 2.9 저장소 3 — `updateStatus`·`deleteNotice` + `noticeStore.ts` barrel
- Description
  - `store/mutateNotice.ts`
    - `updateStatus(id, status, today)`
      - 판정 순서: 읽기 예외 → newer → 대상 없음(손상이면 목록이 `[]`라 `not_found`) → 기록값 계산 → 검증 → 쓰기
      - **기록값은 `recordValuesFor(target, status, today)`로만 계산합니다**(Task 2.4). 이 파일 안에서 `currentDueAmount`·`potentialSaving`을 직접 호출하지 않습니다.
      - 성공하면 updatedAt만 갱신합니다.
    - `deleteNotice(id)`: 남은 항목의 타임스탬프는 그대로 둡니다.
    - 두 함수 모두 백업 키에 쓰지 않습니다.
  - `src/lib/noticeStore.ts`: `loadNotices`·`saveNotice`·`updateStatus`·`deleteNotice`·`classifyStorageError`를 다시 내보냅니다.
- DoD
  - F1-AC-10
    - Quota → 두 함수 모두 `'quota'`, 원문 그대로
    - 없는 id → `'not_found'`
    - 상태별 기록값: paid_early 32000/8000, paid_late currentDue/0, objected null/0, open null/0/null
    - 범칙금에 objected 기록 → `'invalid'`, 쓰기 0회
  - F6-AC-10(저장): 해당 고지서에 `updateStatus(id,'paid_late','2026-10-21')`을 호출하면 40000/0/`'2026-10-21'`로 저장됩니다.
  - F6-AC-11(저장)
    - objected 고지서에 `updateStatus(id,'paid_early','2026-10-09')`를 호출하면 32000/8000으로 저장됩니다.
    - 저장값이 `recordValuesFor` 결과와 같습니다.
  - F1-AC-12: SecurityError → `'unavailable'`, `console.error` 0회
  - F1-AC-18
    - `updateStatus` 뒤 updatedAt만 `'2026-10-11T03:00:00.000Z'`로 바뀝니다.
    - 삭제 뒤 남은 고지서의 타임스탬프는 그대로입니다.
  - F1-AC-19: `updateStatus('x','open',today)`와 `deleteNotice('x')` 모두 `'newer_version'`입니다.
  - F1-AC-17: 대상 id 1건만 바뀝니다.
  - F1-AC-8: 백업 키 쓰기·삭제가 0회입니다.
  - `mutateNotice.ts`에서 `currentDueAmount`·`potentialSaving` import가 0건입니다.
- Covers: F1-AC-8(백업 키 불변), F1-AC-10, F1-AC-12(갱신·삭제), F1-AC-17(단건 대상), F1-AC-18(갱신·삭제), F1-AC-19(갱신·삭제), F6-AC-10(저장), F6-AC-11(저장)
- Files: `src/lib/store/mutateNotice.ts`, `src/lib/store/mutateNotice.test.ts`, `src/lib/noticeStore.ts`
- Depends on: Task 2.8, Task 2.4

---

## Epic 3. 상태 관리 (훅·파생값·폼 검증·문구)

**리스크**
- 복잡도: Medium
- 리스크 요인
  - 화면마다 정렬·합계·배지 규칙을 따로 만들면 홈과 결과 화면의 숫자가 어긋날 수 있습니다(GAP 2-③).
  - 폼 에러 우선순위를 컴포넌트 안에 두면 테스트하기 어렵습니다.
  - 문구가 여러 파일에 흩어지면 오탈자로 AC가 실패합니다.
  - `location.state`를 그대로 캐스팅하면 새로고침 때 크래시합니다.
- 완화
  - 파생값·검증·문구를 순수 모듈로 먼저 고정합니다.
  - 결과 화면 배지도 홈 히어로와 같은 선택자 모듈에서 만듭니다.
  - RouteState 판독기는 null과 형태를 확인한 뒤에만 값을 반환합니다.

### Task 3.1 데이터 훅 `useNotices` & 오늘 날짜 컨텍스트
- Description
  - `useNotices()`
    - `useState(() => loadNotices())`로 동기 초기화합니다. 스피너는 없습니다.
    - 반환값: `{ result, reload(), findById(id?), today }`
  - `TodayProvider`(기본값 `todayYmd()`)를 두어 테스트에서 오늘 날짜를 주입할 수 있게 합니다.
- DoD
  - 키가 없으면 `notices`가 `[]`입니다.
  - 저장한 뒤 `reload()`하면 1건입니다.
  - `findById(undefined)`와 `findById('none')`이 모두 null입니다.
  - `TodayProvider value="2026-10-09"`이면 `today`가 그 값입니다.
  - 리렌더 10회 동안 `loadNotices` 호출이 1회입니다.
- Covers: 직접 AC 없음 (모든 화면 조회와 F5-AC-10·11 재시도의 기반)
- Files: `src/lib/useNotices.ts`, `src/lib/TodayContext.tsx`, `src/lib/useNotices.test.tsx`
- Depends on: Task 2.9, Task 2.2

### Task 3.2 홈·결과 공용 파생값 (`noticeSelectors.ts`)
- Description
  - `buildOpenCards(notices, today)`
    - open 고지서만 고릅니다.
    - 기준 기한은 `getKeyDeadline ?? getLastDeadline`입니다.
    - dday 오름차순, 같으면 createdAt 오름차순으로 정렬합니다.
    - 반환 필드: `{notice, deadline, ddayText, badge, dueText}`
    - 기한이 모두 지났으면 라벨을 `'{label} 지남 · D+n'`으로 씁니다.
    - 과태료 납부기한이 지났으면 금액에 `'부터'`를 붙입니다.
  - `buildSavingsSummary(cards)`: 합계(`potentialSaving` 합)·장수·가장 급한 건을 돌려줍니다. open이 0건이면 null입니다.
  - **`resultSavingBadge(n, today)`**: `{ row: 'discount' | 'current' | 'penaltyFirst'; text: string } | null`
    - 금액은 `potentialSaving(n, today)`이고, 0이거나 open이 아니면 null입니다.
    - F3-AC-15 규칙
      - `hasDiscountStage`이고 key label이 `'감경 마감'` → `{discount, 'N원 절약'}`
      - 그 밖의 과태료 → `{current, 'N원 덜 내요'}`
      - 범칙금 → `{penaltyFirst, 'N원 덜 내요'}`
    - 홈 히어로와 결과 배지가 같은 함수(`potentialSaving`)를 쓰도록 하는 단일 출처입니다.
  - `buildDecidedRows(notices)`
    - decidedAt 내림차순, 같으면 updatedAt 내림차순입니다. 상태별 문구 4종을 씁니다.
    - "감경 납부" 문구 조건: paid_early + `hasDiscountStage` + paidAmount === `calcFineComparison().discounted`
  - `savedTotal(notices)`
- DoD
  - F5-AC-1: C → B → A 순서, dueText 32,000원 / 60,000원 / 32,000원, paid_early는 제외됩니다.
  - F5-AC-2: 28000 / 3장 / `'마트 앞 주정차'` / `'D-2'`. paid_early 1건이 추가돼도 같은 값입니다. open이 0건이면 null입니다.
  - F5-AC-3
    - D-3 → 마감 임박, D-4 → null, D+1 → 기한 지남
    - today `'2026-12-01'`의 과태료는 `'납부기한 지남 · D+1'`, `'41,200원부터'`이고 맨 앞에 옵니다.
    - dday가 같으면 createdAt 순서입니다.
  - F3-AC-14(홈): N0 카드는 `'납부기한'`, `'D-52'`, `'40,000원'`이고 히어로 합계에 1200이 들어갑니다.
  - F3-AC-15
    - F3-AC-1 과태료 → `{discount,'8,000원 절약'}`
    - F3-AC-4(today `'2026-10-21'`) → `{current,'1,200원 덜 내요'}`
    - F3-AC-9 → null
    - F3-AC-10 두 사례 → null
    - 범칙금 40,000원(today `'2026-10-09'`) → `{penaltyFirst,'8,000원 덜 내요'}`
    - 범칙금 40,000원(today `'2026-10-16'`) → null
    - F5-AC-1 B → `'12,000원 덜 내요'`
    - **속성 테스트**: F5-AC-1의 3건 각각에 대해 배지 금액 숫자 = `potentialSaving`이고, 배지 금액의 합 = `buildSavingsSummary().total`입니다.
  - F6-AC-2
    - 문구 4종이 글자 단위로 일치합니다(납부기한이 없으면 접미 생략).
    - 정렬 규칙을 지킵니다.
    - `savedTotal` = 8000
  - F6-AC-10(홈): paid_late 40000 → `'기한 후 납부 · 40,000원'`
  - N0을 paid_early 40000으로 기록한 행은 `'기한 내 납부 · 40,000원'`입니다("감경 납부"가 아님).
  - F6-AC-4: open으로 되돌린 고지서가 `buildOpenCards`에 다시 들어옵니다.
- Covers: F5-AC-1, F5-AC-2, F5-AC-3, F6-AC-2, F6-AC-4(목록 복귀), F3-AC-14(홈), F3-AC-15(파생값), F6-AC-10(홈 문구)
- Files: `src/lib/noticeSelectors.ts`, `src/lib/noticeSelectors.test.ts`
- Depends on: Task 2.4

### Task 3.3 폼 검증 순수 함수 (`noticeFormValidation.ts`)
- Description
  - `validateNoticeForm(values, { today, mode, originalReceivedDate? })`
    - F2-AC-14 우선순위로 필드당 문구 1개를 반환합니다.
    - 범칙금이면 의견제출 기한과 감경 금액은 검사하지 않고, 납부기한 문구는 "1차 납부기한…"을 씁니다.
    - 받은 날이 유효하지 않으면 받은 날과 비교하는 검사를 건너뜁니다.
    - 원래 금액이 유효하지 않으면 감경 금액의 "원래 금액 이상" 검사를 건너뜁니다.
    - 수정 모드에서 받은 날을 바꾸지 않았으면 5년 하한 검사를 건너뜁니다.
  - `firstErrorField(errors)`
  - `toNoticeInput(values)`: trim하고, 범칙금이거나 감경 금액이 비어 있으면 해당 값을 null로 둡니다.
  - `hasRecordAffectingChange(original, input)`
- DoD
  - F2-AC-3: 아래 **7종** 문구가 SPEC과 글자 단위로 같고, 문구마다 테스트가 1건씩 있습니다. 감경 금액을 비운 경우는 오류가 아닙니다.
    1. "고지서 이름을 입력해주세요" (빈 값, 공백만)
    2. "이름은 20자 이내로 입력해주세요"
    3. "금액을 숫자로 입력해주세요"
    4. "금액을 1,000원 이상 입력해주세요"
    5. "금액은 1,000만원 이하로 입력해주세요"
    6. "감경 금액은 1원 이상 입력해주세요"
    7. "감경 금액은 원래 금액보다 작아야 해요"
  - F2-AC-4: 아래 **7종** 문구가 같습니다. 7번은 받은 날·의견제출 기한·납부기한 3개 필드에서 각각 1건씩 테스트합니다.
    1. "의견제출 기한이나 납부기한 중 하나를 입력해주세요"
    2. "기한은 받은 날 이후여야 해요"
    3. "받은 날은 오늘 이후일 수 없어요"
    4. "납부기한은 의견제출 기한 이후여야 해요"
    5. "1차 납부기한은 받은 날 이후여야 해요"
    6. "고지서 받은 날을 입력해주세요"
    7. "올바른 날짜를 입력해주세요"
  - 과태료에서 의견제출 기한을 비우고 납부기한만 넣은 입력(F1-AC-22의 N0)은 오류가 0건입니다.
  - F2-AC-12: `'🚗'×20`은 통과, `'🚗'×21`은 20자 초과 문구입니다.
  - F2-AC-13: 다음 2종 문구를 씁니다.
    - "받은 날은 최근 5년 안의 날짜로 입력해주세요": `'2021-10-08'` 실패, `'2021-10-09'` 통과
    - "기한은 받은 날로부터 1년 안으로 입력해주세요": `'2027-10-06'` 실패, `'2027-10-05'` 통과
    - 수정 모드에서 받은 날을 바꾸지 않으면 2019년 값도 통과합니다.
  - F2-AC-14: 3개 필드에 오류가 나고 `firstErrorField` = `'name'`이며, 필드당 문구는 1개입니다.
  - F2-AC-2: 범칙금이면 숨기기 전 입력값이 있어도 null입니다.
  - F2-AC-9: 이름만 바꾸면 false, amount를 바꾸면 true입니다.
- Covers: F2-AC-2(입력 변환), F2-AC-3, F2-AC-4, F2-AC-9(변경 판정), F2-AC-12, F2-AC-13, F2-AC-14(우선순위)
- Files: `src/lib/noticeFormValidation.ts`, `src/lib/noticeFormValidation.test.ts`
- Depends on: Task 2.1

### Task 3.4 사용자 문구 맵 & RouteState 판독기
- Description
  - `messages.ts`
    - `SAVE_ERROR_TOAST`: limit, quota, invalid, unavailable, newer_version
    - `RECORD_ERROR_TOAST`: quota, unavailable, newer_version·invalid
    - `DELETE_ERROR_TOAST`: 같은 구성
    - **`RECORD_SUCCESS_TOAST`**: F6-AC-11 표의 문구 5종
      - `discountPaid(n)` → "감경 납부를 기록했어요. {n}원 아꼈어요"
      - `paidSaved(n)` → "납부를 기록했어요. {n}원 아꼈어요"
      - `paid` → "납부를 기록했어요"
      - `objected` → "의견제출을 기록했어요"
      - `reopened` → "기록을 되돌렸어요"
    - **결과 화면 보조 문구**
      - `NO_DISCOUNT_ROW` = "의견제출 기한이 없어 감경 납부액을 표시하지 않아요"
      - `NO_DISCOUNT_HINT` = "고지서에 의견제출 기한이 적혀 있으면 '수정'에서 입력해 주세요"
    - 빈 상태·접근 불가·새 버전 화면 문구
    - `isAbortError(e)`
  - `routeState.ts`: `readRouteState(key, raw: unknown)`
    - raw가 객체가 아니면 null입니다.
    - 타입이 맞지 않는 필드는 버립니다.
- DoD
  - 문구 상수가 SPEC 원문과 이 문서의 보완 AC 원문과 글자 단위로 같습니다(스냅샷 테스트).
  - `RECORD_SUCCESS_TOAST.discountPaid(8000)` = "감경 납부를 기록했어요. 8,000원 아꼈어요"
  - `readRouteState('/', undefined)` → null
  - `readRouteState('/', {deletedName:3})` → `{}`, throw 없음
  - `readRouteState('/notice/:id/edit', {focus:'paymentDeadline'})`는 그대로 반환합니다.
  - `isAbortError(new DOMException('', 'AbortError'))` → true
- Covers: F2-AC-6(문구), F3-AC-11(취소 판별), F6-AC-7(문구), F6-AC-9(문구), F6-AC-11(문구), F3-AC-14(문구)
- Files: `src/lib/messages.ts`, `src/lib/messages.test.ts`, `src/lib/routeState.ts`, `src/lib/routeState.test.ts`
- Depends on: Task 1.1

---

## Epic 4. 화면 (컴포넌트 Task → 페이지 조립 Task)

**리스크**
- 복잡도: High. 결과 화면에 상태 분기 5종, 광고 게이트, BottomSheet, AlertDialog가 모입니다.
- 리스크 요인
  - TDS 여백을 덮어쓰면 검수 반려됩니다.
  - 리워드 게이트로 화면 전체를 감쌀 위험이 있습니다.
  - state 없이 직접 진입하면 크래시할 수 있습니다.
  - StrictMode에서 Toast나 impression이 중복 호출될 수 있습니다.
  - 화면 문구의 금액과 저장값이 따로 계산되면 어긋납니다.
- 완화
  - 페이지 파일은 조립 Task 하나만 만듭니다.
  - 1회성 부수효과는 `useRef` 가드로 막고, 테스트에서 호출 횟수를 셉니다.
  - state를 받는 페이지마다 "state 없이 직접 진입" DoD를 둡니다.
  - 간격은 `Spacing size`로만 줍니다.
  - 금액은 `resultSavingBadge`·`recordValuesFor`만 씁니다.

### Task 4.1 공용 상태 화면 + 없는 경로(S5) + 렌더 오류 화면(S6)
- Description
  - `StatusState`: `{title, description?, actionLabel, onAction}`를 받아 `Asset.ContentIcon` + Paragraph.Text + Button으로 렌더합니다.
  - `NotFoundPage`(S5): ScreenScaffold, Top "과태료 감경시계", "페이지를 찾을 수 없어요", "홈으로" → `navigate('/', {replace:true})`
  - `AppErrorBoundary`(S6)
    - fallback 문구 2개와 "다시 시도" → `window.location.reload()`
    - `componentDidCatch`에서 `console.error`를 호출하지 않습니다.
- DoD
  - F7-AC-7: 문구와 버튼이 보이고, 탭하면 navigate가 `('/', {replace:true})`로 1회 호출됩니다.
  - F7-AC-10
    - throw하는 자식을 감싸면 문구 2개가 보입니다.
    - 버튼을 탭하면 reload 스파이가 1회 호출됩니다.
    - `location.href` 대입과 `window.open`이 0회입니다.
  - 커스텀 CSS는 flex 정렬에만 씁니다.
- Covers: F7-AC-7, F7-AC-10
- Files: `src/components/StatusState.tsx`, `src/pages/NotFoundPage.tsx`, `src/pages/NotFoundPage.test.tsx`, `src/components/AppErrorBoundary.tsx`, `src/components/AppErrorBoundary.test.tsx`
- Depends on: Task 3.4

### Task 4.2 홈 컴포넌트 — 미결정 목록·히어로·빈 상태·등록 동작
- Description
  - `SavingsHero`: SummaryHero + CountUp, `data-testid="savings-hero"`
  - `NoticeCard`: Card 안의 ListRow(높이 64px 이상), `data-testid="notice-card"`, Badge
  - `OpenNoticesSection({ notices, today })`
    - 전체 0건: 빈 상태 StatusState(문구 2개 + "고지서 등록")
    - open 0건이고 정리한 고지서만 있음: "남은 고지서가 없어요"
    - 그 밖: hero + 카드 목록
  - `useAddNotice(totalCount)`: 핸들러를 반환합니다.
    - 먼저 `logClick('home_add_notice')`를 호출합니다.
    - 50건이면 Toast "고지서는 50장까지 등록할 수 있어요"만 띄웁니다.
    - 그 밖이면 `navigate('/notice/new')`
  - 카드 탭: `logClick('home_open_notice')` → `navigate('/notice/<id>')`
- DoD (MemoryRouter + TodayProvider `'2026-10-09'`)
  - F5-AC-1: 카드 3개가 C → B → A 순서이고 금액 텍스트가 맞습니다.
  - F5-AC-2: "28,000원"과 보조문이 보입니다. open이 0건이고 정리한 고지서만 있으면 "남은 고지서가 없어요"가 보입니다.
  - F5-AC-3: D-2 카드에 "마감 임박"이 표시됩니다.
  - F3-AC-14(홈): F5-AC-1의 3건에 N0을 더하면 N0 카드에 "D-52"와 "40,000원"이 보이고 히어로가 "29,200원"입니다.
  - F5-AC-4: 0건이면 빈 상태 문구 3개와 버튼이 보이고, `savings-hero`가 0개입니다.
  - F5-AC-5
    - 카드 탭: log 1회, navigate 1회
    - `useAddNotice`: 49건이면 navigate 1회, 50건이면 Toast가 뜨고 navigate 0회
- Covers: F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-4(빈 상태), F5-AC-5(동작), F3-AC-14(홈 표시)
- Files: `src/components/home/SavingsHero.tsx`, `src/components/home/NoticeCard.tsx`, `src/components/home/OpenNoticesSection.tsx`, `src/components/home/useAddNotice.ts`, `src/components/home/OpenNoticesSection.test.tsx`
- Depends on: Task 3.1, Task 3.2, Task 4.1

### Task 4.3 홈 페이지(S1) 조립 — 정리 섹션·Toast·차단 상태·배너
- Description
  - `DecidedSection`: 섹션 제목 "정리한 고지서", `saved-total`, `buildDecidedRows` ListRow
  - `HomePage`: ScreenScaffold, Top "과태료 감경시계", `useNotices()`
    - `unavailable` 또는 `newerVersion`: 차단 StatusState를 보여 줍니다. "다시 시도"를 누르면 `reload()`합니다.
    - 정상
      - 배치 순서: `OpenNoticesSection` → `DecidedSection` → `AdSlot`(1건 이상일 때만, 고정 높이 래퍼 없음)
      - footer 높이만큼 `Spacing`을 두고, SubmitFooter "고지서 등록"에 `useAddNotice`를 연결합니다.
    - `corrupted`: Toast를 1회 띄웁니다. `backupFailed`이면 `unbacked-warning`을 표시합니다.
    - `readRouteState('/', location.state)?.deletedName`이 있으면 삭제 Toast를 1회 띄웁니다.
    - 1회성 Toast는 `useRef` 가드로 막습니다.
  - 이 화면은 앱을 열었을 때만 보이는 표시입니다. 재방문을 유도하는 코드(알림 예약, 외부 캘린더 링크)는 넣지 않습니다(PRD P1).
- DoD
  - F6-AC-2: paid_early 1건이면 상단 카드가 0개이고, "감경 납부 · 32,000원"과 "지금까지 아낀 금액 8,000원"이 보입니다.
  - F5-AC-4: 0건이면 AdSlot이 0개입니다.
  - F5-AC-5: footer 버튼을 탭하면 `logClick('home_add_notice')` 후 `navigate('/notice/new')`가 호출됩니다.
  - F5-AC-6: `'{bad'`이면 Toast가 1회(StrictMode 포함) 뜨고 빈 상태가 보입니다.
  - F5-AC-7: AdSlot이 1개이고 마지막 `notice-card` 뒤에 있으며, 카드 사이에는 0개입니다.
  - F5-AC-8: 삭제 Toast가 1회 뜹니다.
  - F5-AC-9: `unbacked-warning`이 보이고, `backupFailed: false`로 다시 진입하면 0개입니다.
  - F5-AC-10
    - 차단 문구와 "다시 시도"가 보입니다.
    - hero, 카드, 섹션, AdSlot, Footer가 모두 0개이고 손상 Toast도 0회입니다.
    - 재시도 결과가 false면 일반 홈, true면 같은 화면입니다.
  - F5-AC-11: 같은 구조이고 손상 Toast와 `unbacked-warning`이 0개입니다. 재시도 동작도 같습니다.
  - [RouteState] state 없이 진입하거나 `state = 123`이어도 크래시하지 않고 삭제 Toast가 0회입니다.
- Covers: F5-AC-4(배너 미렌더), F5-AC-5(footer), F5-AC-6, F5-AC-7, F5-AC-8, F5-AC-9, F5-AC-10, F5-AC-11, F6-AC-2(화면)
- Files: `src/components/home/DecidedSection.tsx`, `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`
- Depends on: Task 4.2

### Task 4.4 공용 폼 — 필드·유형 전환·금액 입력 (`NoticeFormFields`)
- Description
  - `useNoticeFormState(initial?)`
    - 반환: `values`, `errors`, `setField`, `setErrors`, `fieldRefs`
    - `setField`는 그 필드의 문구만 지웁니다.
  - `AmountField`
    - `inputMode="numeric"`, 천 단위 콤마
    - 입력마다 `parseAmountInput`을 호출합니다.
      - `reject`: 값을 유지하고 거부 문구를 띄웁니다.
      - 다음 `ok` 입력: 거부 문구를 지웁니다.
  - `NoticeFormFields`
    - 필드 순서: 이름(네이티브 `maxLength` 없음) → Chip+ChipItem "과태료"/"범칙금" → 원래 금액 → 감경 금액(과태료만) → 받은 날 → 의견제출 기한(과태료만, 도움말) → 납부기한
    - 범칙금이면 라벨을 "1차 납부기한 (선택)"으로 바꾸고 도움말 "비워 두면 받은 날로부터 10일 뒤로 계산해요 (도로교통법 제164조)"를 표시합니다.
    - 필드마다 `enterKeyHint="next"`를 주고, 포커스되면 `scrollIntoView({block:'center'})`합니다.
- DoD
  - F2-AC-2: "범칙금"을 탭하면 두 필드가 사라지고 라벨과 도움말이 바뀝니다.
  - F2-AC-7: "40000"을 입력하면 "40,000"으로 보이고, `inputMode`가 `numeric`이며, 포커스 시 `scrollIntoView`가 1회 호출됩니다.
  - F2-AC-11
    - "40000.5" → 값은 빈 상태 그대로이고 문구가 즉시 보입니다.
    - "40,000"에서 "."을 누르면 값이 그대로입니다.
    - "-5000", "−5000", "－5000", "-40000.5" → 음수 문구
    - 감경 금액 필드도 같습니다.
    - 이어서 "4"를 입력하면 문구가 사라집니다.
  - F2-AC-12: 이름 input에 `maxlength` 속성이 없습니다.
  - F2-AC-14: 금액 값을 바꾸면 금액 문구만 사라지고, 이름 문구는 남습니다.
- Covers: F2-AC-2(UI 전환), F2-AC-7(키패드·스크롤), F2-AC-11(입력 거부), F2-AC-12(필드), F2-AC-14(문구 해제)
- Files: `src/components/form/useNoticeFormState.ts`, `src/components/form/AmountField.tsx`, `src/components/form/NoticeFormFields.tsx`, `src/components/form/NoticeFormFields.test.tsx`
- Depends on: Task 3.3, Task 3.4

### Task 4.5 제출 흐름 + 신규 등록 페이지(S2) `NoticeCreatePage`
- Description
  - `useNoticeSubmit({ formState, mode, id?, original?, successToast, beforeSave? })`
    - 탭 1회마다 `logClick('notice_save')`를 1회 호출합니다. 다이얼로그 확인 단계에서는 호출하지 않습니다.
    - `validateNoticeForm` 결과를 모든 필드에 동시에 표시합니다. 거부 문구도 이 결과로 바꿉니다.
    - 첫 오류 필드로 이동합니다. 일반 필드는 `focus()` + `scrollIntoView`, date 필드는 `scrollIntoView`만 합니다.
    - `beforeSave`가 있으면 그 결과(옵션 또는 취소)를 반영합니다.
    - `saveNotice` 결과 처리
      - `unbacked`: `UnbackedSaveDialog`를 엽니다. "저장하기"를 누르면 `{discardCorrupt:true}`로 다시 저장합니다.
      - 그 밖의 오류: `SAVE_ERROR_TOAST`를 띄우고 입력값을 유지합니다.
      - 성공: Toast를 띄운 뒤 `navigate('/notice/<id>', {replace:true, state:{justSaved:true}})`
  - `NoticeCreatePage`: ScreenScaffold, Top "고지서 등록", `NoticeFormFields`, SubmitFooter "저장"(키보드 위 유지)
- DoD
  - F2-AC-1: 저장소에 1건이 생기고, navigate 인자가 일치하며, Toast "고지서를 등록했어요"와 log 1회가 확인됩니다.
  - F2-AC-2: 범칙금 전환 전에 입력한 감경 금액 30000이 null로 저장됩니다.
  - F2-AC-3·4: Task 3.3 목록의 오류 입력마다 해당 문구가 보이고 `saveNotice` 호출이 0회입니다.
  - F1-AC-22(입력): 의견제출 기한을 비우고 납부기한 `'2026-11-30'`만 넣은 과태료는 저장되고 결과 화면으로 이동합니다.
  - F2-AC-6: limit, quota, invalid가 각각 맞는 Toast를 띄우고, 입력값이 유지되며, `console.error`가 0회입니다.
  - F2-AC-7: SubmitFooter 안에 "저장" Button이 렌더됩니다.
  - F2-AC-10(신규): `'{bad'`이고 백업이 있는 상태에서 신규 저장하면 `{version:1, notices:[1건]}`이 되고, 백업 키 값은 그대로입니다.
  - F2-AC-11: 거부 문구가 뜬 빈 금액 필드로 저장하면 "금액을 숫자로 입력해주세요"로 바뀝니다.
  - F2-AC-12: 이모지 20개 이름으로 저장되고, 저장된 name이 이모지 20개입니다.
  - F2-AC-13: 5년 하한 문구와 1년 상한 문구가 보이고, 경계값은 통과합니다.
  - F2-AC-14
    - 문구 3개가 동시에 보입니다.
    - 이름에 focus 1회, `scrollIntoView` 1회
    - 첫 오류가 받은 날이면 focus 0회, `scrollIntoView` 1회
  - F2-AC-15
    - 다이얼로그 문구 3개가 보입니다.
    - "저장하기" → 3번째 인자가 `{discardCorrupt:true}`이고 결과 화면으로 이동합니다.
    - "취소" → 원문 그대로, 입력값 유지
    - log 1회
    - "저장하기" 뒤 `'quota'`이면 Toast가 뜹니다.
  - F2-AC-16(신규): `'unavailable'`이면 Toast가 뜨고 입력값이 유지됩니다.
  - F2-AC-17(신규): `'newer_version'`이면 Toast가 뜨고, 다이얼로그가 0개이며, 원문이 그대로입니다.
- Covers: F2-AC-1, F2-AC-2(저장값), F2-AC-3, F2-AC-4, F2-AC-6, F2-AC-7(footer), F2-AC-10(신규), F2-AC-11(재검증), F2-AC-12(저장), F2-AC-13, F2-AC-14, F2-AC-15, F2-AC-16(신규), F2-AC-17(신규)
- Files: `src/components/form/useNoticeSubmit.ts`, `src/components/form/UnbackedSaveDialog.tsx`, `src/pages/NoticeCreatePage.tsx`, `src/pages/NoticeCreatePage.test.tsx`
- Depends on: Task 4.4, Task 3.1, Task 4.1

### Task 4.6 수정 페이지(S3) `NoticeEditPage`
- Description: Task 4.4의 `NoticeFormFields`·`useNoticeFormState`와 Task 4.5의 `useNoticeSubmit`을 그대로 씁니다.
  - 차단 상태(폼은 렌더하지 않고 "홈으로" → `navigate('/', {replace:true})`)
    - `unavailable`
    - `newerVersion`
    - `corrupted`이거나 id가 없음 → "고지서를 찾을 수 없어요"
  - 정상
    - Top "고지서 수정", 저장값으로 프리필합니다.
    - `readRouteState('/notice/:id/edit', location.state)?.focus === 'paymentDeadline'`이면 마운트할 때 납부기한에 포커스합니다.
    - `beforeSave`: status가 open이 아니고 `hasRecordAffectingChange`이면 `RecordResetDialog`를 엽니다. "바꾸기" → `{resetRecord:true}`, "취소" → 저장하지 않습니다.
    - 성공 Toast는 "고지서를 수정했어요"입니다.
- DoD
  - F2-AC-5: 프리필 값이 저장값과 같습니다. amount를 50000으로 저장하면 반영되고 Toast가 뜹니다. 없는 id면 빈 상태입니다.
  - F2-AC-8: `document.activeElement`가 납부기한 input입니다.
  - F2-AC-9
    - 이름만 바꾸면 다이얼로그가 0개이고 기록값이 유지됩니다.
    - amount를 바꾸면 다이얼로그가 뜹니다.
    - "바꾸기" → open/null/0/null, Toast
    - "취소" → 저장 0회, 입력값 유지
    - open 고지서에서는 다이얼로그가 0개입니다.
  - F2-AC-10: corrupted 상태의 수정 모드는 빈 상태입니다.
  - F2-AC-13: 받은 날을 바꾸지 않으면 2019년 데이터도 저장됩니다.
  - F2-AC-16·17(수정): 각 차단 화면이 보입니다.
  - F3-AC-14(수정 경로): N0에 의견제출 기한 `'2026-10-20'`을 추가해 저장하면, 결과 화면 진입 시 감경 행이 활성화되고 "8,000원 절약"이 보입니다(Task 4.10 페이지 렌더로 확인).
  - [RouteState] state가 없거나 `'x'`여도 크래시하지 않고 포커스 이동이 없습니다.
- Covers: F2-AC-5, F2-AC-8, F2-AC-9, F2-AC-10(수정), F2-AC-13(수정 모드), F2-AC-16(수정), F2-AC-17(수정)
- Files: `src/components/form/RecordResetDialog.tsx`, `src/pages/NoticeEditPage.tsx`, `src/pages/NoticeEditPage.test.tsx`
- Depends on: Task 4.5

### Task 4.7 결과 컴포넌트 1 — 무료 층 `FreeTier` & `LegalNotice`
- Description
  - `FreeTier({ notice, today })`
    - `data-testid="free-tier"`, `TossRewardAd`를 import하지 않습니다.
    - status가 `objected`이면 hero 위에 "의견제출 결과를 기다리는 중이에요. 받아들여지지 않으면 감경 없이 부과될 수 있어요"
    - `dday-hero`(SummaryHero + CountUp) 4가지 변형
      - 기본
      - 납부기한 입력 요청: 아래에 "납부기한 입력" Button → `navigate('/notice/<id>/edit', {state:{focus:'paymentDeadline'}})`
      - 과태료 기한 경과
      - 범칙금 기한 경과
    - `compare-card`: Card + ListRow 3개
      - 과태료 감경 행의 3가지 모드
        - 활성: t2 타이포
        - 기간 종료: "감경 기간이 끝났어요" + `var(--adaptiveGrey400)`
        - **감경 단계 없음**(`!hasDiscountStage`): `NO_DISCOUNT_ROW` + `var(--adaptiveGrey400)`
      - "지금 내면 N원" 강조
      - 범칙금: 3행
      - **배지는 `resultSavingBadge(notice, today)` 결과 하나만 씁니다.** `row` 값에 맞는 행에 Badge를 붙이고, null이면 Badge 0개입니다. 이 컴포넌트에서 `potentialSaving`·`saving`으로 배지 금액을 직접 만들지 않습니다.
    - 감경 규칙 안내: `hasDiscountStage`이고 감경 마감 전인 과태료일 때만 표시합니다.
    - `!hasDiscountStage`인 과태료: compare-card 아래에 `NO_DISCOUNT_HINT`
    - 기한이 모두 지난 과태료: 중가산금 안내
  - `LegalNotice`: 다음 두 문구를 담습니다.
    - "고지서의 가상계좌, 이파인, 위택스에서 낼 수 있어요"
    - "법령의 일반 기준으로 계산한 참고값이에요. 고지서에 적힌 금액과 기한이 우선이에요."
- DoD (TodayProvider)
  - F3-AC-1(Value AC): `'2026-10-09'`에 free-tier 안에 문구 5개가 모두 보입니다.
  - F3-AC-2: 슬롯 ID가 없어도 "D-11", "32,000원", "40,000원"이 보입니다. FreeTier 소스에서 TossRewardAd import가 0건입니다.
  - F3-AC-3: hero 값 "D-11", 보조문 "2026.10.20(화)", compare-card의 ListRow 3개, Badge 1개("8,000원 절약")
  - F3-AC-4: "납부기한까지 D-40 · 2026.11.30(월)", "감경 기간이 끝났어요", "지금 내면 40,000원" 강조, 그 행에 Badge "1,200원 덜 내요"
  - F3-AC-5: "1차 납부기한까지 D-6 · 2026.10.15(목)"과 3행 문구가 보입니다. free-tier 안의 "감경"·"절약" 텍스트가 0건입니다.
  - F3-AC-6: 감경 안내 문구와 `LegalNotice` 문구가 글자 단위로 같습니다.
  - F3-AC-9: 입력 요청 hero가 보이고, 버튼 navigate 인자가 일치하며, 41,200원 행이 유지되고, Badge가 0개입니다.
  - F3-AC-10: 두 사례의 hero와 강조 문구가 맞고 Badge가 0개입니다.
  - **F3-AC-14**
    - N0(today `'2026-10-09'`): hero "납부기한까지 D-52 · 2026.11.30(월)"
    - 감경 행 `NO_DISCOUNT_ROW`(비활성 색)
    - "지금 내면 40,000원" 행에 Badge "1,200원 덜 내요"
    - "납부기한까지 안 내면 41,200원부터"
    - "N원 절약" 0개, 감경 규칙 안내 0개, `NO_DISCOUNT_HINT` 1개
  - **F3-AC-15**
    - 범칙금(today `'2026-10-09'`) 1차 행에 Badge "8,000원 덜 내요"가 보이고, "감경"·"절약" 텍스트는 0건입니다.
    - 같은 고지서 today `'2026-10-16'` → Badge 0개
    - F5-AC-1 B → "12,000원 덜 내요"
    - `FreeTier.tsx`에서 `potentialSaving` import가 0건입니다(배지 단일 출처).
  - F6-AC-3: objected 고지서에 대기 문구가 hero 위에 보이고, 기준 기한이 2026.11.30입니다.
  - F7-AC-1: `LegalNotice`에 납부처 문구가 있고 `<a href`가 0개입니다.
- Covers: F3-AC-1, F3-AC-2(컴포넌트), F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-6(문구), F3-AC-9, F3-AC-10, F3-AC-14, F3-AC-15, F6-AC-3(표시), F7-AC-1(납부처 문구)
- Files: `src/components/result/FreeTier.tsx`, `src/components/result/LegalNotice.tsx`, `src/components/result/FreeTier.test.tsx`
- Depends on: Task 3.1, Task 3.2, Task 3.4, Task 2.4, Task 2.2

### Task 4.8 결과 컴포넌트 2 — 잠금 층 게이트 `ScenarioGate`
- Description
  - `ScenarioGate({ notice })`
    - `revealed` 상태를 가집니다.
    - `revealed`가 false인 동안 `TossRewardAd` 바깥 바로 위에 `locked-hint`를 둡니다. 문구는 과태료와 범칙금이 다릅니다.
    - `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}><LockedTier …/></TossRewardAd>`
  - `LockedTier`
    - `data-testid="locked-tier"`
    - `useLayoutEffect`로 마운트될 때 `onRevealed()`와 `logImpression('scenario_locked_tier')`를 1회 호출합니다.
  - `FineScenarioTable`
    - 월 [0,1,3,6,12,24,36,60]으로 `scenario-row` 8개를 그립니다.
    - "한 달 늦을 때마다 N원씩 더 붙어요"와 60개월 상한 안내를 둡니다.
    - Sparkline 61점, MiniBar(원래 금액·최대 가산금)
    - 납부기한이 있으면 첫 행 라벨이 "YYYY.MM.DD부터"입니다.
    - 납부기한이 없으면 상대 라벨을 쓰고, 안내 문구와 "납부기한 입력" 버튼을 둡니다.
    - 감경 단계 유무(`opinionDeadline`)와 관계없이 같은 표를 그립니다. 가산금은 납부기한 기준이기 때문입니다.
  - `PenaltyTimeline`: ListRow 3개
  - 잠금 해제 여부는 저장하지 않습니다.
- DoD (TossRewardAd를 "즉시 렌더"와 "미렌더" 두 가지로 모킹)
  - F4-AC-1: 41,680원 / 46,960원 / 70,000원이 보이고, `locked-tier`의 조상에 TossRewardAd 모킹이 있습니다.
  - F4-AC-2: `scenario-row`가 8개이고 문구 순서와 "480원씩"이 맞습니다.
  - F4-AC-3: 상한 안내 문구가 일치합니다.
  - F4-AC-4: Sparkline data 길이가 61, MiniBar 값이 40000/30000입니다.
  - F4-AC-5: 범칙금 3행 문구가 일치합니다.
  - F4-AC-6: 납부기한 null → 상대 라벨·안내·버튼 navigate 인자 일치. `'2026-11-30'` → 첫 행이 "2026.12.01부터"
  - F1-AC-22의 N0에서도 첫 행이 "2026.12.01부터"이고 `scenario-row`가 8개입니다.
  - F4-AC-7: 즉시 렌더 모킹에서 Toast 0회, `console.error` 0회, impression 1회이고, 첫 렌더부터 `locked-hint`가 0개입니다.
  - F4-AC-9
    - 미렌더 모킹에서 `locked-tier`가 0개이고 `locked-hint`가 보입니다(과태료·범칙금 문구 각각).
    - impression 0회, Toast 0회
    - 다시 마운트해도 다시 잠기고, localStorage 키 수가 변하지 않습니다.
- Covers: F4-AC-1(게이트 구조), F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-5, F4-AC-6, F4-AC-7, F4-AC-9
- Files: `src/components/result/ScenarioGate.tsx`, `src/components/result/LockedTier.tsx`, `src/components/result/FineScenarioTable.tsx`, `src/components/result/PenaltyTimeline.tsx`, `src/components/result/ScenarioGate.test.tsx`
- Depends on: Task 2.4, Task 2.2

### Task 4.9 결과 컴포넌트 3 — 납부·결정 기록 시트 & 삭제 다이얼로그
- Description
  - `recordOptions(n, today)`: `{status, label, logKey: string | null, toast: string}[]`를 반환합니다.
    - `asOpen = { ...n, status: 'open' }`, `key = getKeyDeadline(asOpen, today)`로 판정합니다.
    - **각 옵션의 금액 N = `recordValuesFor(n, 옵션 status, today).paidAmount`**. 이 함수 밖에서 금액을 계산하지 않습니다.
    - 첫 옵션은 F6-AC-11 표를 따릅니다.

      | 조건 | 첫 옵션 | status |
      |---|---|---|
      | 과태료, key가 감경 마감 | "감경가 N원으로 납부했어요" | paid_early |
      | 과태료, key가 납부기한 | "기한 안에 N원 납부했어요" | paid_early |
      | 범칙금, key가 1차 납부기한 | "1차 기한 안에 N원 납부했어요" | paid_early |
      | 범칙금, key가 2차 납부기한 | "2차 기한 안에 N원 납부했어요" | paid_early |
      | key가 null | "기한 지나서 N원 납부했어요" | paid_late |

    - 과태료에만 "의견제출을 했어요"를 넣습니다.
    - "아직 결정 안 했어요"는 항상 넣습니다.
    - `toast`와 `logKey`는 F6-AC-11의 Toast·로그 표를 따르고, 문구는 `RECORD_SUCCESS_TOAST`에서 가져옵니다. 저장 결과의 savedAmount로 문구를 고릅니다.
  - `RecordSheet({ notice, today, open, onClose, onRecorded })`
    - BottomSheet 안에 옵션 ListRow(56px 이상)를 둡니다.
    - 옵션 탭 → `updateStatus`
      - 성공: `logKey`가 있으면 `logClick(logKey)`를 호출하고 Toast를 띄웁니다. paid_early면 `requestReviewOnce()`를 호출합니다. 마지막에 `onRecorded()`
      - 실패: `RECORD_ERROR_TOAST`
  - `DeleteDialog({ notice, open, onClose })`
    - "'{이름}' 고지서를 삭제할까요?"
    - "삭제" 성공 → `navigate('/', {replace:true, state:{deletedName}})`
    - "삭제" 실패 → `DELETE_ERROR_TOAST`
    - "취소" → 변경 없음
- DoD
  - F6-AC-1: 저장값이 paid_early/32000/8000/`'2026-10-09'`이고, Toast "감경 납부를 기록했어요. 8,000원 아꼈어요"가 뜨며, `logClick('mark_paid_early')`와 `requestReviewOnce`가 각 1회입니다.
  - F6-AC-3: objected로 기록되고 Toast "의견제출을 기록했어요"와 `mark_objected` 1회가 확인됩니다. 범칙금 옵션에는 "의견제출"이 0개입니다.
  - F6-AC-4: "아직 결정 안 했어요" → open/null/0/null, Toast "기록을 되돌렸어요", logClick 0회
  - F6-AC-5: 다이얼로그 문구가 보입니다. "삭제" → 저장소 0건 + navigate 인자 일치, "취소" → 변경 0, `'quota'` → Toast, navigate 0회
  - F6-AC-6
    - `'2026-10-21'` 과태료: 첫 옵션 "기한 안에 40,000원 납부했어요", savedAmount 1200, Toast "납부를 기록했어요. 1,200원 아꼈어요"
    - 범칙금: "1차 기한 안에 40,000원 납부했어요", savedAmount 8000
  - F6-AC-7: `'quota'` → Toast, status 유지
  - F6-AC-8
    - 첫 옵션이 "기한 지나서 41,200원 납부했어요"이고 감경·기한 안 옵션이 0개입니다.
    - 저장값이 paid_late/41200/0/`'2026-12-01'`이고, Toast "납부를 기록했어요"가 뜨며, `mark_paid_late` 1회, `requestReviewOnce` 0회입니다.
    - `getKeyDeadline`이 있는 고지서에서는 이 옵션이 0개입니다.
  - **F6-AC-10**
    - 옵션 3개가 이 순서입니다: "기한 지나서 40,000원 납부했어요" → "의견제출을 했어요" → "아직 결정 안 했어요"
    - 첫 옵션 → paid_late/40000/0/`'2026-10-21'`, Toast "납부를 기록했어요", `mark_paid_late` 1회, 리뷰 0회
  - **F6-AC-11**
    - 범칙금 today `'2026-10-16'` 첫 옵션이 "2차 기한 안에 48,000원 납부했어요"입니다. 탭하면 paid_early/48000/0, Toast "납부를 기록했어요", `mark_paid_early` 1회입니다.
    - objected 과태료 today `'2026-10-09'` 첫 옵션이 "감경가 32,000원으로 납부했어요"이고 저장 paidAmount가 32000입니다.
    - **속성 테스트**: F6-AC-1·6·8·10·11의 모든 고지서에서 첫 옵션 문구의 금액 숫자와 탭 뒤 저장된 paidAmount가 같습니다.
  - F6-AC-9
    - `'unavailable'` 기록 → Toast, `requestReviewOnce`와 `mark_*` 0회
    - `'unavailable'` 삭제 → Toast, navigate 0회
    - `newer_version`·`invalid` → 기록·삭제 문구가 각각 맞습니다.
    - `console.error` 0회
  - `recordOptions.ts`에서 `currentDueAmount`·`potentialSaving` import가 0건입니다.
- Covers: F6-AC-1, F6-AC-3(기록), F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7, F6-AC-8, F6-AC-9, F6-AC-10, F6-AC-11
- Files: `src/lib/recordOptions.ts`, `src/lib/recordOptions.test.ts`, `src/components/result/RecordSheet.tsx`, `src/components/result/RecordSheet.test.tsx`, `src/components/result/DeleteDialog.tsx`, `src/components/result/DeleteDialog.test.tsx`
- Depends on: Task 3.1, Task 3.4, Task 2.4

### Task 4.10 결과 페이지(S4) 조립 — 차단 상태·노출 로그·공유·배치
- Description
  - `ShareButton`
    - 탭하면 `logClick('result_share')` → `loading=true` → `await shareApp()`
    - 예외가 AbortError가 아니면 Toast "공유하지 못했어요. 잠시 후 다시 시도해 주세요"
    - 마지막에 `loading=false`
  - `NoticeResultPage`
    - `useParams<{id}>()`, `useNotices()`
    - 차단 분기를 먼저 확인합니다: unavailable → newerVersion → corrupted/없는 id. 이때 FreeTier와 ScenarioGate는 마운트하지 않습니다.
    - 정상
      - Top은 고지서 이름이고, 우측 "수정"은 `navigate('/notice/<id>/edit')`
      - 배치 순서: FreeTier → "납부·결정 기록" Button → ScenarioGate → 공유·삭제 버튼 행(flex 2열) → LegalNotice → AdSlot(고정 높이 래퍼 없음)
      - RecordSheet의 `onRecorded`는 `reload()`, 삭제 버튼은 DeleteDialog를 엽니다.
      - `logImpression('result_free_tier')`는 진입당 1회입니다(`useRef` 가드).
    - `location.state`는 `readRouteState('/notice/:id', …)`로만 읽습니다.
- DoD
  - F3-AC-2: free-tier의 조상에 TossRewardAd 모킹이 0개입니다.
  - F4-AC-1: locked-tier는 TossRewardAd 안에 있고, free-tier는 바깥에 있습니다.
  - F3-AC-6: `LegalNotice`가 공유·삭제 행 아래, AdSlot 위에 있습니다.
  - F3-AC-7: 없는 id와 corrupted에서 빈 상태가 보이고, free-tier와 locked-tier가 0개입니다.
  - F3-AC-8: `justSaved` 유무와 관계없이 impression이 정확히 1회입니다(StrictMode 포함). 공유 탭 시 log → `shareApp` 순서로 호출됩니다.
  - F3-AC-11
    - reject → Toast 1회, `console.error` 0회
    - AbortError → Toast 0회
    - 대기 중에 2번 더 탭해도 `shareApp`은 1회
  - F3-AC-12·13: 각 차단 문구가 보이고, TossRewardAd 마운트 0회, impression 2종 모두 0회입니다.
  - F4-AC-8: 없는 id, corrupted, newerVersion 세 경우 모두 TossRewardAd 마운트 0회, `scenario_locked_tier` 0회입니다.
  - F3-AC-14(페이지): N0 결과 페이지에 `NO_DISCOUNT_ROW`와 Badge "1,200원 덜 내요"가 보입니다.
  - F6-AC-3: 의견제출을 기록하면 `reload` 뒤 대기 문구가 보입니다.
  - F6-AC-4: 되돌리기 뒤 홈으로 가면 카드가 다시 보입니다.
  - F6-AC-10(화면 반영): 기록한 뒤 `reload`하면 free-tier가 paid_late 상태로 렌더되고 크래시가 없습니다.
  - [RouteState] state 없이 직접 진입해도 정상 렌더되고, `state = 'x'`여도 같습니다. id가 없으면 빈 상태입니다.
- Covers: F3-AC-2(구조), F3-AC-6(배치), F3-AC-7, F3-AC-8, F3-AC-11, F3-AC-12, F3-AC-13, F3-AC-14(페이지), F4-AC-1(배치), F4-AC-8, F6-AC-3(화면 반영), F6-AC-4(화면 반영), F6-AC-10(화면 반영)
- Files: `src/components/result/ShareButton.tsx`, `src/pages/NoticeResultPage.tsx`, `src/pages/NoticeResultPage.test.tsx`
- Depends on: Task 4.7, Task 4.8, Task 4.9, Task 4.1

---

## Epic 5. 통합 & 검수 대응

**리스크**
- 복잡도: Medium
- 리스크 요인
  - 라우트 순서가 틀리면 `/notice/new`가 `:id` 라우트로 잡힐 수 있습니다.
  - ErrorBoundary를 잘못된 위치에 둘 수 있습니다.
  - 빌드 타깃이 높으면 Android 7에서 구문 오류가 납니다.
  - 금지 패턴이 검수 직전에야 발견될 수 있습니다.
  - 광고 ID는 빌드 시점에 주입되므로 ID를 바꾸면 재빌드가 필요합니다.
  - 홈과 결과 화면의 금액 일관성은 단위 테스트만으로는 화면 사이에서 깨질 수 있습니다.
- 완화
  - 라우트 테스트로 순서를 고정합니다.
  - 금지 패턴은 소스 스캔 테스트로 잡습니다. 이 Epic은 검사만 하고 기존 소스 파일을 고치지 않습니다. 위반이 나오면 해당 파일을 소유한 Task의 결함으로 되돌립니다.
  - 배포 체크리스트에 재빌드 항목을 넣습니다.
  - 전체 흐름 테스트에서 범칙금과 감경 단계 없는 과태료의 홈·결과 금액을 비교합니다.

### Task 5.1 라우팅 연결 & 에러 경계 배치
- Description: `src/App.tsx`에 라우트를 등록합니다.
  - `/` → HomePage
  - `/notice/new` → NoticeCreatePage
  - `/notice/:id/edit` → NoticeEditPage
  - `/notice/:id` → NoticeResultPage
  - `*` → NotFoundPage
  - `AppErrorBoundary`는 Router 안쪽에서 `<Routes>`를 감쌉니다. `TodayProvider`는 최상단에 둡니다. FloatingTabBar는 렌더하지 않습니다.
- DoD (MemoryRouter)
  - `/notice/new` → "고지서 등록" 폼
  - `/notice/abc/edit` → 수정 빈 상태
  - `/notice/abc` → 결과 빈 상태
  - F7-AC-7: `/unknown` → "페이지를 찾을 수 없어요"
  - F7-AC-10: 라우트가 throw하도록 모킹하면 S6 fallback이 보입니다.
  - FloatingTabBar 렌더 0회
- Covers: F7-AC-7(라우트), F7-AC-10(배치)
- Files: `src/App.tsx`, `src/App.routes.test.tsx`
- Depends on: Task 4.3, Task 4.5, Task 4.6, Task 4.10, Task 4.1

### Task 5.2 검수 정적 규칙 테스트 & 빌드 타깃
- Description
  - `src/**/*.{ts,tsx,css}`와 `dist/`를 스캔하는 테스트를 만듭니다.
    - 외부 이탈: `window.location.href = 'http`, `window.open(`, `<a href="http`
    - 설치 유도·외부 분석: "앱을 설치", "다운로드", `google-analytics`, `gtag`, `amplitude`, `mixpanel`
    - 색상: `#[0-9a-fA-F]{3,8}\b`, `var(--tds-color-`
    - 호환성: `crypto.randomUUID`, `structuredClone`, `.findLast(`, `Object.hasOwn`, `.at(`
    - 결제·프로모션: `TossPurchase`, `IAP.`, `grantPromotionReward`
    - AdSlot을 감싸는 요소에 `height`·`minHeight`·`background`가 없는지
    - **MVP 범위**: 알림 관련 API(`Notification`, `requestPermission`, `scheduleNotification`) 사용이 0건인지 확인합니다(PRD P1 범위 제외 확인).
  - 배너 실패 테스트: AdSlot을 throw·빈 렌더로 모킹해 홈과 결과 페이지를 렌더합니다.
  - `vite.config.ts`의 `build.target`을 `['es2017','safari15']`로 설정합니다.
  - README에 배포 체크리스트를 추가합니다.
- DoD
  - F7-AC-1·2·3·5·8: 패턴마다 테스트가 1개씩 있고 모두 0건으로 통과합니다(산출물은 `vite build` 뒤 `dist/` 대상).
  - 알림 API 스캔이 0건으로 통과합니다.
  - F7-AC-9
    - 래퍼 스타일 검사가 통과합니다.
    - 모킹한 실패 상태에서 Toast 0회, `console.error` 0회입니다.
    - LegalNotice, 공유·삭제 버튼, 카드가 그대로 렌더됩니다.
  - `build.target` 값이 일치합니다.
  - README에 다음 2줄이 있습니다.
    - "`VITE_TOSS_AD_GROUP_ID`·`VITE_TOSS_AD_SLOT_ID`는 빌드 시점 주입 — 값을 바꾸면 재빌드 필요"
    - "마감 알림(PRD 기능 5)은 MVP 제외 — 홈 '마감 임박' 배지는 앱을 열었을 때만 보임"
- Covers: F7-AC-1, F7-AC-2, F7-AC-3, F7-AC-5, F7-AC-8, F7-AC-9
- Files: `src/__tests__/compliance.test.ts`, `src/__tests__/adFailure.test.tsx`, `vite.config.ts`, `README.md`
- Depends on: Task 5.1

### Task 5.3 전체 흐름 통합 테스트 & 터치 영역 점검
- Description
  - App + MemoryRouter + jsdom localStorage로 흐름 2개를 실행합니다.
    - **흐름 A** (TodayProvider `'2026-10-09'`): 홈(빈 상태) → 등록 → 결과 → 감경 납부 기록 → 홈 → 결과 → 삭제 → 홈
    - **흐름 B** (TodayProvider `'2026-10-09'`)
      1. 범칙금(40,000원, 받은 날 `'2026-10-05'`)을 등록합니다.
      2. 과태료 N0(의견제출 기한 비움, 납부기한 `'2026-11-30'`)을 등록합니다.
      3. 홈 히어로를 확인합니다.
      4. 각 결과 화면의 배지를 확인합니다.
      5. N0에서 "기한 안에 40,000원 납부했어요"를 기록합니다.
      6. 홈 정리 섹션을 확인합니다.
  - 터치 영역 정적 검사: Button·ListRow·ChipItem에 44px 미만 `height`/`min-height`나 `padding: 0` 덮어쓰기가 없는지 확인합니다.
  - 기기에서 수동 측정합니다.
- DoD
  - F7-AC-4: 두 흐름 모두 `console.error`가 0회입니다. 흐름 A에서 단계별로 다음 문구가 보입니다.
    - "고지서를 등록했어요"
    - "D-11"
    - "8,000원 아꼈어요"
    - "지금까지 아낀 금액 8,000원"
    - "'강남 주정차' 고지서를 삭제했어요"
  - F6-AC-2: 흐름 A 중 홈에 "감경 납부 · 32,000원"이 보이고 `notice-card`가 0개입니다.
  - **F3-AC-15(교차 화면)**: 흐름 B에서 다음이 확인됩니다.
    - 홈 히어로 "9,200원"(8,000 + 1,200)
    - 범칙금 결과에 "8,000원 덜 내요"
    - N0 결과에 "1,200원 덜 내요"
    - 두 결과 화면 배지 금액의 합이 히어로 금액과 같습니다.
  - **F3-AC-14·F6-AC-11(통합)**: 흐름 B의 N0 기록 뒤 다음이 확인됩니다.
    - Toast "납부를 기록했어요. 1,200원 아꼈어요"
    - 홈 "기한 내 납부 · 40,000원"
    - "지금까지 아낀 금액 1,200원"
    - 히어로 "8,000원"
  - F7-AC-6
    - 정적 검사가 통과합니다.
    - 홈 카드, 칩 2개, 폼 버튼, 시트 옵션 4개, 다이얼로그 버튼의 측정값이 모두 44px 이상이고 `docs/qa-touch.md`에 기록돼 있습니다.
- Covers: F7-AC-4, F7-AC-6, F6-AC-2(통합 확인), F3-AC-15(교차 화면), F3-AC-14(통합), F6-AC-11(통합)
- Files: `src/__tests__/fullFlow.test.tsx`, `src/__tests__/touchTargets.test.ts`, `docs/qa-touch.md`
- Depends on: Task 5.2

---

## 파일 소유 확인 (중복 0건)

| Task | 만드는·수정하는 파일 |
|---|---|
| 1.1 | `src/lib/types.ts` |
| 1.2 | `src/lib/fineRules.ts`, `src/lib/schema/schemaConstants.ts` |
| 2.1 | `src/lib/inputRules.ts`, `src/lib/inputRules.test.ts` |
| 2.2 | `src/lib/dateUtils.ts`, `src/lib/dateUtils.test.ts` |
| 2.3 | `src/lib/engine/amounts.ts`, `src/lib/engine/amounts.test.ts` |
| 2.4 | `src/lib/engine/deadlines.ts`, `src/lib/engine/deadlines.test.ts`, `src/lib/fineEngine.ts` |
| 2.5 | `src/lib/schema/validateNotices.ts`, `src/lib/schema/validateNotices.test.ts` |
| 2.6 | `src/lib/schema/versioning.ts`, `src/lib/schema/versioning.test.ts`, `src/lib/schema/corruptBackup.ts`, `src/lib/schema/corruptBackup.test.ts`, `src/lib/noticeSchema.ts` |
| 2.7 | `src/lib/store/storageCore.ts`, `src/lib/store/loadNotices.ts`, `src/lib/store/loadNotices.test.ts` |
| 2.8 | `src/lib/store/saveNotice.ts`, `src/lib/store/saveNotice.test.ts` |
| 2.9 | `src/lib/store/mutateNotice.ts`, `src/lib/store/mutateNotice.test.ts`, `src/lib/noticeStore.ts` |
| 3.1 | `src/lib/useNotices.ts`, `src/lib/TodayContext.tsx`, `src/lib/useNotices.test.tsx` |
| 3.2 | `src/lib/noticeSelectors.ts`, `src/lib/noticeSelectors.test.ts` |
| 3.3 | `src/lib/noticeFormValidation.ts`, `src/lib/noticeFormValidation.test.ts` |
| 3.4 | `src/lib/messages.ts`, `src/lib/messages.test.ts`, `src/lib/routeState.ts`, `src/lib/routeState.test.ts` |
| 4.1 | `src/components/StatusState.tsx`, `src/components/AppErrorBoundary.tsx`, `src/components/AppErrorBoundary.test.tsx`, `src/pages/NotFoundPage.tsx`, `src/pages/NotFoundPage.test.tsx` |
| 4.2 | `src/components/home/SavingsHero.tsx`, `NoticeCard.tsx`, `OpenNoticesSection.tsx`, `useAddNotice.ts`, `OpenNoticesSection.test.tsx` |
| 4.3 | `src/components/home/DecidedSection.tsx`, `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx` |
| 4.4 | `src/components/form/useNoticeFormState.ts`, `AmountField.tsx`, `NoticeFormFields.tsx`, `NoticeFormFields.test.tsx` |
| 4.5 | `src/components/form/useNoticeSubmit.ts`, `UnbackedSaveDialog.tsx`, `src/pages/NoticeCreatePage.tsx`, `src/pages/NoticeCreatePage.test.tsx` |
| 4.6 | `src/components/form/RecordResetDialog.tsx`, `src/pages/NoticeEditPage.tsx`, `src/pages/NoticeEditPage.test.tsx` |
| 4.7 | `src/components/result/FreeTier.tsx`, `LegalNotice.tsx`, `FreeTier.test.tsx` |
| 4.8 | `src/components/result/ScenarioGate.tsx`, `LockedTier.tsx`, `FineScenarioTable.tsx`, `PenaltyTimeline.tsx`, `ScenarioGate.test.tsx` |
| 4.9 | `src/lib/recordOptions.ts`, `src/lib/recordOptions.test.ts`, `src/components/result/RecordSheet.tsx`, `RecordSheet.test.tsx`, `DeleteDialog.tsx`, `DeleteDialog.test.tsx` |
| 4.10 | `src/components/result/ShareButton.tsx`, `src/pages/NoticeResultPage.tsx`, `src/pages/NoticeResultPage.test.tsx` |
| 5.1 | `src/App.tsx`, `src/App.routes.test.tsx` |
| 5.2 | `src/__tests__/compliance.test.ts`, `src/__tests__/adFailure.test.tsx`, `vite.config.ts`, `README.md` |
| 5.3 | `src/__tests__/fullFlow.test.tsx`, `src/__tests__/touchTargets.test.ts`, `docs/qa-touch.md` |

이번 수정으로 새로 생긴 파일은 없습니다. `hasDiscountStage`·`recordValuesFor`는 2.4, `resultSavingBadge`는 3.2, 문구는 3.4가 소유한 기존 파일에 들어갑니다.

---

## AC Coverage

- AC 총수: **95** (F1 22 · F2 17 · F3 15 · F4 9 · F5 11 · F6 11 · F7 10). SPEC 90개에 보완 5개(F1-AC-22, F3-AC-14, F3-AC-15, F6-AC-10, F6-AC-11)를 더한 수입니다.
- Task로 커버한 AC: **95**

| AC | Task |
|---|---|
| F1-AC-1, AC-2, AC-3, AC-4 | 2.3 |
| F1-AC-5 | 2.3, 2.4 |
| F1-AC-6, AC-11 | 2.4 |
| F1-AC-7 | 2.7, 2.8 |
| F1-AC-8 | 2.7, 2.8, 2.9 |
| F1-AC-9 | 2.5, 2.6, 2.7 |
| F1-AC-10 | 2.9 |
| F1-AC-12 | 2.7, 2.8, 2.9 |
| F1-AC-13 | 2.8 |
| F1-AC-14 | 2.1 |
| F1-AC-15 | 2.5, 2.8 |
| F1-AC-16 | 2.1, 2.5 |
| F1-AC-17 | 2.5, 2.7, 2.9 |
| F1-AC-18 | 2.8, 2.9 |
| F1-AC-19 | 2.6, 2.7, 2.8, 2.9 |
| F1-AC-20 | 2.6 |
| F1-AC-21 | 2.6, 2.7 |
| **F1-AC-22** | 2.3, 2.4, 2.5, 2.8, 3.3, 4.5 |
| F2-AC-1 | 4.5 |
| F2-AC-2 | 3.3, 4.4, 4.5 |
| F2-AC-3, AC-4 | 3.3, 4.5 |
| F2-AC-5, AC-8 | 4.6 |
| F2-AC-6 | 3.4, 4.5 |
| F2-AC-7 | 4.4, 4.5 |
| F2-AC-9 | 3.3, 4.6 |
| F2-AC-10 | 4.5, 4.6 |
| F2-AC-11 | 4.4, 4.5 |
| F2-AC-12 | 3.3, 4.4, 4.5 |
| F2-AC-13 | 3.3, 4.5, 4.6 |
| F2-AC-14 | 3.3, 4.4, 4.5 |
| F2-AC-15 | 4.5 |
| F2-AC-16, AC-17 | 4.5(신규), 4.6(수정) |
| F3-AC-1(Value AC), AC-3, AC-4, AC-5, AC-9, AC-10 | 4.7 |
| F3-AC-2, AC-6 | 4.7, 4.10 |
| F3-AC-7, AC-8, AC-12, AC-13 | 4.10 |
| F3-AC-11 | 3.4, 4.10 |
| **F3-AC-14** | 3.2, 3.4, 4.2, 4.7, 4.10, 5.3 |
| **F3-AC-15** | 3.2, 4.7, 5.3 |
| F4-AC-1 | 4.8, 4.10 |
| F4-AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-9 | 4.8 |
| F4-AC-8 | 4.10 |
| F5-AC-1, AC-2, AC-3 | 3.2, 4.2 |
| F5-AC-4, AC-5 | 4.2, 4.3 |
| F5-AC-6, AC-7, AC-8, AC-9, AC-10, AC-11 | 4.3 |
| F6-AC-1, AC-5, AC-6, AC-8 | 4.9 |
| F6-AC-2 | 3.2, 4.3, 5.3 |
| F6-AC-3 | 4.7, 4.9, 4.10 |
| F6-AC-4 | 3.2, 4.9, 4.10 |
| F6-AC-7, AC-9 | 3.4, 4.9 |
| **F6-AC-10** | 2.4, 2.9, 3.2, 4.9, 4.10 |
| **F6-AC-11** | 2.4, 2.9, 3.4, 4.9, 5.3 |
| F7-AC-1 | 4.7, 5.2 |
| F7-AC-2, AC-3, AC-5, AC-8, AC-9 | 5.2 |
| F7-AC-4, AC-6 | 5.3 |
| F7-AC-7, AC-10 | 4.1, 5.1 |

- 미커버: **0**
- PRD 대응: PRD 기능 5(푸시)는 「착수 전 문서 반영」 P1로 범위에서 제외하므로 AC가 없습니다. Task 5.2가 알림 API 0건을 확인합니다.

### 참고 (SPEC 밖 결정·확인 필요)
- **S2/S3 "같은 컴포넌트"**: 등록과 수정은 같은 폼 컴포넌트, 같은 상태 훅, 같은 제출 훅을 씁니다. 라우트 진입 파일만 둘로 나눴습니다.
- **감경 단계 판정(F1-AC-22)**: `opinionDeadline`이 null인 과태료는 감경을 적용하지 않습니다. 법령상 감경은 의견제출 기간 안의 자진 납부에만 적용되는데(질서위반행위규제법 제18조), 기간을 모르면 적용 여부를 판단할 수 없기 때문입니다. 이 판정은 `hasDiscountStage` 한 곳에서만 합니다.
- **objected 고지서의 기록 금액(F6-AC-11)**: SPEC F1-AC-10 규칙(open으로 보고 계산)을 그대로 따릅니다. 그래서 의견제출 뒤에도 감경 마감 전에 납부를 기록하면 감경가가 됩니다. 의견제출 뒤 자진 납부에도 감경이 유지되는지는 법령 확인이 필요합니다(SPEC Open Questions 3에 추가 권장).
- **범칙금 2차 기한 경과 뒤 기록 금액**: F1-AC-11에 따라 "기한 지나서 48,000원"으로 기록합니다. 즉결심판 뒤 금액은 법원이 정하므로 실제 납부액과 다를 수 있습니다. 직접 입력이 필요한지 Open Questions에 추가하기를 권장합니다.
- **중가산금 끝수(Task 2.3)**: 월 1.2% 항을 먼저 버림한 뒤 개월 수를 곱하는 방식으로 해석했습니다. Open Questions 2와 함께 확인이 필요합니다.
- **템플릿 의존**: 다음은 템플릿 제공을 전제로 합니다. Task 4.2, 4.7, 4.8, 4.10을 시작하기 전에 실제 경로를 확인하세요.
  - 컴포넌트: SummaryHero, CountUp, Sparkline, MiniBar, SubmitFooter, ScreenScaffold
  - 함수: `logClick`, `logImpression`, `shareApp`, `requestReviewOnce`