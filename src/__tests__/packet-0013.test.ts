/**
 * packet 0013 — 결과 심화 층 ScenarioGate (월별 가산금 표 · 범칙금 타임라인, 리워드 게이트)
 *
 * 공유 헬퍼(mocks.ts)는 import하지 않는다: 그 파일의 vi.mock이 import 시점에 같이 등록돼
 * 이 파일이 거는 TossRewardAd·SDK 목을 덮을 수 있다. 필요한 목은 아래에서 직접 건다.
 * TossRewardAd 목은 children을 div[data-testid="reward-gate"] 안에만 렌더한다 —
 * 그래서 "locked-tier의 조상에 TossRewardAd가 있다"를 DOM으로 물을 수 있다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';

const h = React.createElement;

const gate = vi.hoisted(() => ({
  /** 'real' = 템플릿 TossRewardAd(SDK 목과 함께), 'locked' = 보상 전에 닫혀 children이 안 열린 상태 */
  mode: 'real' as 'real' | 'locked',
  slotIds: [] as unknown[],
  loadMode: 'error' as 'error' | 'loaded',
}));
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
const log = vi.hoisted(() => ({ impression: vi.fn(), click: vi.fn() }));
const toast = vi.hoisted(() => ({ open: vi.fn() }));

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => nav.navigate,
}));

vi.mock('@apps-in-toss/web-framework', () => ({
  loadFullScreenAd: vi.fn((opts: { onEvent?: (e: unknown) => void; onError?: (e: unknown) => void }) => {
    if (gate.loadMode === 'error') opts.onError?.(new Error('no ad'));
    else opts.onEvent?.({ type: 'loaded' });
  }),
  showFullScreenAd: vi.fn(),
  generateHapticFeedback: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  DWELL_MS: 3000,
  fireAndForget: vi.fn(),
  logScreen: vi.fn(),
  logClick: log.click,
  logImpression: log.impression,
  useScreenLog: vi.fn(),
}));

vi.mock('@/components/TossRewardAd', async () => {
  const actual = await vi.importActual<typeof import('@/components/TossRewardAd')>('@/components/TossRewardAd');
  return {
    TossRewardAd: (props: { slotId: unknown; children: React.ReactNode }) => {
      gate.slotIds.push(props.slotId);
      return h(
        'div',
        { 'data-testid': 'reward-gate' },
        gate.mode === 'locked' ? h('button', null, '광고 보고 확인하기') : h(actual.TossRewardAd as never, props as never),
      );
    },
  };
});

vi.mock('@toss/tds-mobile', () => {
  const slot = (name: string, node: unknown) => (node == null || node === false ? null : h('span', { 'data-slot': name }, node as never));
  return {
    Button: ({ children, onClick, display: _d, variant: _v, size: _s, color: _c, ...p }: any) =>
      h('button', { type: 'button', onClick, ...p }, children),
    // 벤더처럼 children은 버린다 — 내용은 left/contents/right 슬롯으로만 그려진다.
    ListRow: Object.assign(
      ({ left, contents, right, onClick, children: _dropped, ...p }: any) =>
        h(
          'li',
          { onClick, role: onClick ? 'button' : undefined, ...p },
          slot('left', left),
          h('span', { 'data-slot': 'contents' }, contents),
          slot('right', right),
        ),
      {
        Texts: ({ top, bottom, type }: any) =>
          h(React.Fragment, null, h('span', { 'data-type': type, 'data-slot': 'top' }, top), h('span', { 'data-slot': 'bottom' }, bottom)),
        Text: ({ children }: any) => h('span', null, children),
        AssetIcon: ({ name }: any) => h('span', { 'data-asset': name }),
      },
    ),
    Spacing: ({ size }: any) => h('div', { 'data-spacing': size }),
    Border: () => h('hr'),
    Badge: ({ children }: any) => h('span', { role: 'status' }, children),
    Text: ({ children, typography, color: _c, ...p }: any) => h('div', { 'data-typography': typography, ...p }, children),
    Paragraph: Object.assign(
      ({ children, typography, color: _c, ...p }: any) => h('div', { 'data-typography': typography, ...p }, children),
      {
        Text: ({ children, typography, color: _c, fontWeight: _f, ...p }: any) => h('span', { 'data-typography': typography, ...p }, children),
      },
    ),
    useToast: () => ({ openToast: toast.open }),
    Toast: ({ open, text }: any) => (open ? h('div', { role: 'status' }, text) : null),
  };
});

import { ScenarioGate } from '@/components/result/ScenarioGate';
import type { Notice } from '@/lib/types';

const fine: Notice = {
  id: 'n1',
  name: '강남 주정차',
  kind: 'fine',
  amount: 40000,
  discountedAmount: null,
  receivedDate: '2026-10-05',
  opinionDeadline: '2026-10-20',
  paymentDeadline: '2026-11-30',
  status: 'open',
  paidAmount: null,
  savedAmount: 0,
  decidedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};
const fineNoDeadline: Notice = { ...fine, paymentDeadline: null };
const penalty: Notice = { ...fine, id: 'n2', kind: 'penalty', opinionDeadline: null, paymentDeadline: null };

const flat = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, '');
const renderGate = (notice: Notice) =>
  render(h(MemoryRouter, null, h(ScenarioGate as React.ComponentType<{ notice: Notice }>, { notice })));

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  gate.mode = 'real';
  gate.loadMode = 'error';
  gate.slotIds.length = 0;
  nav.navigate.mockClear();
  log.impression.mockClear();
  log.click.mockClear();
  toast.open.mockClear();
  vi.stubEnv('VITE_TOSS_AD_SLOT_ID', 'slot-from-env');
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  errorSpy.mockRestore();
});

describe('결과 심화 층 ScenarioGate — 월별 가산금 표·범칙금 타임라인(리워드 게이트)', () => {
  it('AC-1[P0]: 게이트가 열리면 locked-tier에 41,680원·46,960원·70,000원이 보이고 조상에 TossRewardAd가 있다', () => {
    renderGate(fine);
    const tier = screen.getByTestId('locked-tier');
    expect(tier.closest('[data-testid="reward-gate"]')).not.toBeNull();
    const t = tier.textContent ?? '';
    expect(t).toContain('41,680원');
    expect(t).toContain('46,960원');
    expect(t).toContain('70,000원');
    // slotId는 env에서 읽어 TossRewardAd로 넘긴다(리터럴 금지)
    expect(gate.slotIds[0]).toBe('slot-from-env');
  });

  it('AC-1[P0]: 광고를 보상 전에 닫으면 게이트만 남고 locked-tier·가산금 값은 렌더되지 않는다', () => {
    gate.mode = 'locked';
    renderGate(fine);
    expect(screen.getByTestId('reward-gate')).toBeInTheDocument();
    expect(screen.queryByTestId('locked-tier')).toBeNull();
    expect(screen.queryAllByTestId('scenario-row')).toHaveLength(0);
    expect(document.body.textContent).not.toContain('41,680원');
    expect(log.impression).not.toHaveBeenCalled();
  });

  it('AC-2[P0]: 과태료 40000이면 scenario-row 8개가 SPEC 순서이고 60개월 상한 안내가 표 아래에 있다', () => {
    renderGate(fine);
    const rows = screen.getAllByTestId('scenario-row');
    expect(rows).toHaveLength(8);
    const expected: Array<[string, string]> = [
      ['납부기한 다음 날', '41,200원'],
      ['1개월', '41,680원'],
      ['3개월', '42,640원'],
      ['6개월', '44,080원'],
      ['12개월', '46,960원'],
      ['24개월', '52,720원'],
      ['36개월', '58,480원'],
      ['60개월', '70,000원'],
    ];
    rows.forEach((row, i) => {
      expect(flat(row)).toContain(expected[i][1]);
    });
    // 납부기한이 있으면 첫 행은 날짜 라벨("2026.12.01부터"), 없으면 상대 표기 — 둘째 행부터는 개월 표기
    expect(flat(rows[0])).toContain('2026.12.01부터');
    expect(flat(rows[1])).toContain('1개월');
    expect(flat(rows[7])).toContain('60개월');
    expect(screen.getByText('한 달 늦을 때마다 480원씩 더 붙어요')).toBeInTheDocument();

    const cap = screen.getByText('중가산금은 60개월까지만 붙어요 — 최대 원래 금액의 75% (질서위반행위규제법 제24조)');
    const lastRow = rows[7];
    // 안내 문구는 마지막 행보다 문서상 뒤에 있다
    expect(lastRow.compareDocumentPosition(cap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC-2[P0]: 납부기한이 없으면 행 라벨은 상대 표기이고 첫 두 행은 납부기한 다음 날 41,200원·1개월 41,680원이다', () => {
    renderGate(fineNoDeadline);
    const rows = screen.getAllByTestId('scenario-row');
    expect(rows).toHaveLength(8);
    expect(flat(rows[0])).toContain('납부기한다음날');
    expect(flat(rows[0])).toContain('41,200원');
    expect(flat(rows[1])).toContain('1개월');
    expect(flat(rows[1])).toContain('41,680원');
    rows.forEach((row) => expect(flat(row)).not.toMatch(/20\d\d\.\d\d\.\d\d/));
  });

  it('AC-3[P2]: scenario-sparkline은 month 0~60의 61개 점이고 scenario-minibar는 원래 금액 40,000원·최대 가산금 30,000원 비중이다', () => {
    renderGate(fine);
    const spark = screen.getByTestId('scenario-sparkline');
    // Sparkline의 선 path: M 한 번 + L 60번 = 점 61개
    const paths = Array.from(spark.querySelectorAll('path')).map((p) => p.getAttribute('d') ?? '');
    const line = paths.find((d) => !d.includes('Z')) ?? '';
    expect((line.match(/[ML]/g) ?? []).length).toBe(61);

    const bar = screen.getByTestId('scenario-minibar');
    const now = Number(bar.getAttribute('aria-valuenow'));
    // 30,000 / 70,000 ≈ 43 또는 40,000 / 70,000 ≈ 57 — 어느 쪽 비중이든 두 금액이 같은 카드에 적혀 있어야 한다
    expect([43, 57]).toContain(now);
    const tier = screen.getByTestId('locked-tier');
    expect(tier.textContent).toContain('40,000원');
    expect(tier.textContent).toContain('30,000원');
  });

  it('AC-4[P1]: 범칙금 receivedDate 2026-10-05이면 1차·2차·즉결심판 3행이 순서대로 보이고 가산금 표는 없다', () => {
    renderGate(penalty);
    const tier = screen.getByTestId('locked-tier');
    expect(within(tier).queryAllByTestId('scenario-row')).toHaveLength(0);
    expect(within(tier).queryByTestId('scenario-sparkline')).toBeNull();
    const rows = Array.from(tier.querySelectorAll('li'));
    expect(rows).toHaveLength(3);
    expect(flat(rows[0])).toContain('~2026.10.15');
    expect(flat(rows[0])).toContain('40,000원');
    expect(flat(rows[1])).toContain('2026.10.16~2026.11.04');
    expect(flat(rows[1])).toContain('48,000원');
    expect(flat(rows[2])).toContain('2026.11.05부터즉결심판청구');
    expect(flat(rows[2])).toContain('금액은법원이정해요');
  });

  it('AC-5[P1]: 납부기한 null이면 입력 안내 문구와 납부기한 입력 Button이 보이고 탭하면 수정 화면으로 이동한다', () => {
    renderGate(fineNoDeadline);
    expect(screen.getByText('본 고지서의 납부기한을 입력하면 체납 시작일도 보여드려요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '납부기한 입력' }));
    expect(nav.navigate).toHaveBeenCalledWith('/notice/n1/edit', { state: { focus: 'paymentDeadline' } });
  });

  it('AC-5[P1]: 납부기한이 있으면 안내 문구와 납부기한 입력 Button이 없다', () => {
    renderGate(fine);
    expect(screen.queryByText('본 고지서의 납부기한을 입력하면 체납 시작일도 보여드려요')).toBeNull();
    expect(screen.queryByRole('button', { name: '납부기한 입력' })).toBeNull();
  });

  it('AC-5[P0]: 광고 실패로 즉시 렌더되면 Toast 0회·console.error 0회·impression 1회다', () => {
    renderGate(fine);
    expect(screen.getByTestId('locked-tier')).toBeInTheDocument();
    expect(toast.open).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);
    expect(log.impression).toHaveBeenCalledTimes(1);
    expect(log.impression).toHaveBeenCalledWith('scenario_locked_tier');
  });

  it('AC-5[P0]: 리렌더해도 impression은 1회로 유지된다', () => {
    const { rerender } = renderGate(fine);
    rerender(h(MemoryRouter, null, h(ScenarioGate as React.ComponentType<{ notice: Notice }>, { notice: { ...fine, name: '이름 수정' } })));
    expect(screen.getByTestId('locked-tier')).toBeInTheDocument();
    expect(log.impression).toHaveBeenCalledTimes(1);
  });

  it('AC-5[P0]: 광고를 보상 전에 닫으면 locked-tier와 impression이 모두 0이고 Toast·console.error도 0이다', () => {
    gate.mode = 'locked';
    renderGate(penalty);
    expect(screen.queryByTestId('locked-tier')).toBeNull();
    expect(log.impression).toHaveBeenCalledTimes(0);
    expect(toast.open).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });
});
