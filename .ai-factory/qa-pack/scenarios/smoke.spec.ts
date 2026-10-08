import { test, expect } from '@playwright/test';

// nightcrew Sentinel smoke 팩 — Factory 산출(§7.1)
// 핵심 막: 고지서 유형(과태료·범칙금)과 받은 날, 고지서의 의견제출·납부 기한 입력, 감경 마감 D-day와 감경 시 납부액 계산, 기한을 넘기면 붙는 가산금·중가산금 시나리오를 월별로 계산 (리워드 광고 후 공개), 고지서를 여러 장 등록하고 이름을 붙여 각각 D-day 표시, 마감 하루 전 알림 (토스 푸시 연동 가능 시)
// 토스 브릿지 의존 구간(로그인·결제)은 외부 재현 불가 — 화면 도달 확인까지만.
const ROUTES = ["/","/Home.test","/Home","/NotFound.test","/NotFound"];
// WebView 밖 실행에서만 나는 콘솔 에러는 무시(앱인토스 관례 — toss visual-smoke 템플릿 계승)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /granite/i, /apps-in-toss/i];

for (const route of ROUTES) {
  test(`smoke: ${route} 렌더링과 콘솔 에러 없음`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
