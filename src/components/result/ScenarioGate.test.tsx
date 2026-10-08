import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

const gate = vi.hoisted(() => ({ open: true }));

vi.mock('@/lib/analytics', () => ({
  DWELL_MS: 3000,
  fireAndForget: vi.fn(),
  logScreen: vi.fn(),
  logClick: vi.fn(),
  logImpression: vi.fn(),
  useScreenLog: vi.fn(),
}));

vi.mock('@/components/TossRewardAd', () => ({
  TossRewardAd: ({ children }: { children: React.ReactNode }) => (gate.open ? <>{children}</> : null),
}));

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

const renderGate = (onTierMount: () => void) =>
  render(
    <MemoryRouter>
      <ScenarioGate notice={fine} onTierMount={onTierMount} />
    </MemoryRouter>,
  );

describe('ScenarioGate onTierMount', () => {
  beforeEach(() => {
    gate.open = true;
  });

  it('게이트가 열려 locked-tier가 그려지면 한 번 호출된다', () => {
    const onTierMount = vi.fn();
    renderGate(onTierMount);
    expect(screen.getByTestId('locked-tier')).toBeInTheDocument();
    expect(onTierMount).toHaveBeenCalledTimes(1);
  });

  it('게이트가 닫혀 있으면 호출되지 않는다', () => {
    gate.open = false;
    const onTierMount = vi.fn();
    renderGate(onTierMount);
    expect(screen.queryByTestId('locked-tier')).toBeNull();
    expect(onTierMount).not.toHaveBeenCalled();
  });
});
