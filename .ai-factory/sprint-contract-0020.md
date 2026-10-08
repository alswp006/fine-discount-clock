# Sprint Contract — 패킷 0020
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

ㅇ## Sprint Contract: 검수 대응 정적 가드 테스트와 전체 흐름 스모크(최종 폴리시)

**만들 항목**
- `src/lib/qualityGuards.test.ts` 신규: `src/**/*.{ts,tsx,css}`를 읽어 금지 패턴 0건 확인.
  - 외부 이탈: `window.open(`, `window.location.href = 'http`, `<a href="http`
  - 설치 유도: `'앱을 설치'`, `'다운로드'`
  - 외부 분석 SDK: `google-analytics`, `gtag`, `amplitude`, `mixpanel`
  - 색상: `#[0-9a-fA-F]{3,8}\b`, `var(--tds-color-`
  - 호환 불가 API: `crypto.randomUUID`, `structuredClone`, `findLast`, `Object.hasOwn`, `.at(`
  - IAP/프로모션: `TossPurchase`, `IAP.`, `grantPromotionReward`
  - AdSlot 감싼 요소의 `height`, `min-height`, `background` 스타일 0건
  - 제외 규칙: 테스트 파일(`*.test.ts(x)`)과 테스트 데이터 문자열은 스캔 대상에서 제외하고, 제외 사유를 테스트 상단 주석에 명시
- `src/lib/flowSmoke.test.tsx` 신규: `MemoryRouter`로 홈 → 등록 → 결과 → 기록 → 삭제 흐름 실행, `console.error` spy 호출 0회 확인, 마지막에 홈에서 삭제 Toast 1회 노출 확인

**사용할 TypeScript 타입**
- `src/lib/types.ts`에서 `import type { Notice, NoticeInput, NoticeKind, NoticeStatus, LoadResult } from './types'`
- 픽스처 데이터는 `NoticeInput`과 `Notice` 타입으로 선언

**검증 방법**
- `npx vitest run src/lib/qualityGuards.test.ts src/lib/flowSmoke.test.tsx` 통과
- 위반 발견 시 대상 소스 파일은 수정하지 않고, 테스트 실패 메시지와 파일:라인을 보고 목록에 기록
- 가드 테스트가 실제로 파일을 스캔하는지 확인하기 위해 스캔 파일 수를 `expect(files.length).toBeGreaterThan(0)`으로 단언

**절대 하면 안 되는 것**
- `src/App.tsx`, `src/main.tsx` 수정 금지
- 위반을 해결하려고 `src/` 내 기존 소스 파일 수정 금지 (보고만)
- 테스트를 통과시키려고 금지 패턴을 약화하거나 제외 목록을 임의로 확장 금지
- `src/lib/types.ts` 수정 금지, 타입 재정의 금지
- 외부 URL 호출, 외부 분석 SDK 도입 금지
