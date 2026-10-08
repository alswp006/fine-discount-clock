import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { mockAll, mockNavigate } from '@/__tests__/__helpers__/mocks';
import { FreeTier } from '@/components/result/FreeTier';
import { LegalNotice } from '@/components/result/LegalNotice';
import type { Notice } from '@/lib/types';

mockAll();

const fine: Notice = {
  id: 'n1',
  name: '강남 주정차',
  kind: 'fine',
  amount: 40000,
  discountedAmount: null,
  receivedDate: '2026-10-05',
  opinionDeadline: '2026-10-20',
  paymentDeadline: null,
  status: 'open',
  paidAmount: null,
  savedAmount: 0,
  decidedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const penalty: Notice = { ...fine, id: 'n2', kind: 'penalty', opinionDeadline: null };

const renderTier = (notice: Notice, today: string) =>
  render(
    <MemoryRouter>
      <FreeTier notice={notice} today={today} />
    </MemoryRouter>,
  );

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ');

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('FreeTier', () => {
  it('감경 마감 전 과태료: D-day·금액 비교 3행·절약 배지 1개', () => {
    renderTier(fine, '2026-10-09');
    const tier = screen.getByTestId('free-tier');
    expect(text(tier)).toContain('감경 마감까지 D-11 · 2026.10.20(화)');
    expect(within(tier).getByTestId('dday-hero')).toBeInTheDocument();
    expect(within(tier).getByTestId('compare-card').querySelectorAll('li')).toHaveLength(3);
    expect(within(tier).getAllByRole('status').map((b) => b.textContent)).toEqual(['8,000원 절약']);
    expect(within(tier).getByText(/32,000원/)).toBeInTheDocument();
    expect(within(tier).getByText(/제18조/)).toBeInTheDocument();
  });

  it('감경 마감 후 납부기한 없음: 입력 요청과 이동 버튼, 감경 행은 비활성 색', () => {
    renderTier(fine, '2026-10-21');
    const tier = screen.getByTestId('free-tier');
    expect(within(tier).getByText('납부기한을 입력해 주세요')).toBeInTheDocument();
    expect(within(tier).getByText('감경 기간이 끝났어요').closest('[style*="--adaptiveGrey400"]')).not.toBeNull();
    expect(within(tier).queryAllByRole('status')).toHaveLength(0);
    fireEvent.click(within(tier).getByRole('button', { name: '납부기한 입력' }));
    expect(mockNavigate).toHaveBeenCalledWith('/notice/n1/edit', { state: { focus: 'paymentDeadline' } });
  });

  it('범칙금: 감경 문구 없이 1차·2차·즉결심판 3행', () => {
    renderTier(penalty, '2026-10-09');
    const tier = screen.getByTestId('free-tier');
    expect(text(tier)).toContain('1차 납부기한까지 D-6 · 2026.10.15(목)');
    expect(within(tier).getByTestId('compare-card').querySelectorAll('li')).toHaveLength(3);
    expect(text(tier)).not.toContain('감경');
  });

  it('모든 기한이 지나면 지남 문구와 중가산금 안내, 배지 없음', () => {
    renderTier({ ...fine, paymentDeadline: '2026-11-30' }, '2026-12-01');
    const tier = screen.getByTestId('free-tier');
    expect(text(tier)).toContain('납부기한이 지났어요 · D+1 · 2026.11.30(월)');
    expect(within(tier).getByText(/중가산금이 더 붙어요/)).toBeInTheDocument();
    expect(within(tier).queryAllByRole('status')).toHaveLength(0);
  });
});

describe('LegalNotice', () => {
  it('고정 고지 두 줄이 있고 링크는 없다', () => {
    const { container } = render(<LegalNotice />);
    expect(screen.getByText(/고지서에 적힌 금액과 기한이 우선이에요/)).toBeInTheDocument();
    expect(screen.getByText(/가상계좌, 이파인, 위택스/)).toBeInTheDocument();
    expect(container.querySelectorAll('a[href]')).toHaveLength(0);
  });
});
