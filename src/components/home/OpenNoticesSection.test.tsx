import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import { mockAll } from '@/__tests__/__helpers__/mocks';
import { OpenNoticesSection } from '@/components/home/OpenNoticesSection';
import { buildOpenCards } from '@/lib/noticeSelectors';
import type { Notice } from '@/lib/types';

mockAll();

const base: Notice = {
  id: 'x',
  name: 'x',
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

describe('OpenNoticesSection', () => {
  it('고지서가 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(
      <MemoryRouter>
        <OpenNoticesSection cards={[]} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('D-day 오름차순으로 카드를 그리고 임박 배지를 붙인다', () => {
    const a: Notice = { ...base, id: 'a', name: '강남 주정차' };
    const c: Notice = { ...base, id: 'c', name: '마트 앞 주정차', opinionDeadline: '2026-10-11' };
    render(
      <MemoryRouter>
        <OpenNoticesSection cards={buildOpenCards([a, c], '2026-10-09')} />
      </MemoryRouter>,
    );
    const cards = screen.getAllByTestId('notice-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('마트 앞 주정차')).toBeInTheDocument();
    expect(within(cards[0]).getByText('마감 임박')).toBeInTheDocument();
    expect(within(cards[1]).queryByText('마감 임박')).toBeNull();
    expect(screen.getByText('남은 고지서')).toBeInTheDocument();
  });
});
