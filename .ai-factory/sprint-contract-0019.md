# Sprint Contract — 패킷 0019
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

## Sprint Contract: 라우팅 연결·ErrorBoundary·TodayProvider 배선·빌드 타깃

**만들 항목**
- `src/App.tsx`: react-router-dom `Routes`로 `/`→Home, `/notice/new`→NoticeCreate, `/notice/:id`→NoticeResult, `/notice/:id/edit`→NoticeEdit, `*`→NotFound 연결. `/notice/new`가 `:id`에 매칭되지 않도록 정적 경로를 동적 경로보다 우선 배치한다.
- `src/App.tsx`: 전체 라우트를 `AppErrorBoundary`(바깥)와 `TodayProvider`(안쪽)로 감싼다.
- NotFound는 '페이지를 찾을 수 없어요', ErrorBoundary 폴백은 '일시적인 문제가 생겼어요'를 렌더한다.
- `vite.config.ts`: `build.target = ['es2017', 'safari15']`.

**사용 타입**
- `src/lib/types.ts`에서 필요한 타입만 import한다(예: `Notice`, `NoticeInput`). 타입 재정의 금지.
- 라우트 파라미터 `id`는 `Notice['id']`(string)로 다룬다.

**검증**
- `/`, `/notice/new`(Top '고지서 등록' 노출), `/notice/<id>`, `/notice/<id>/edit`, `/unknown`을 각각 확인한다.
- 하위 컴포넌트가 throw할 때 폴백 문구가 보이고 흰 화면이 되지 않는지 확인한다.
- `npm run build` 성공, `src/main.tsx` diff 0줄.

**절대 금지**
- `src/main.tsx` 수정 금지(진입점 단일 소유자는 이 패킷).
- 라우트 페이지 내부 로직·스타일 수정 금지.
- `build.target` 임의 변경 금지.
- `types.ts`의 `LoadResult` 정의가 닫는 중괄호 없이 잘려 있으면 직접 고치지 말고 보고한다.
