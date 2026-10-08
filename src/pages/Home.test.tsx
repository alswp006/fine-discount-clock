import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockAll, mockNavigate, mockLocation } from '@/__tests__/__helpers__/mocks';
import { renderWithRouter } from '@/__tests__/__helpers__/test-utils';
import { TodayProvider } from '@/lib/TodayContext';
import type { LoadResult, Notice } from '@/lib/types';

mockAll();

const loadMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/noticeStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/noticeStore')>()),
  loadNotices: loadMock,
}));

import Home from '@/pages/Home';

const T0 = '2026-10-01T00:00:00.000Z';
const open: Notice = {
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
  createdAt: T0,
  updatedAt: T0,
};

const result = (over: Partial<LoadResult> = {}): LoadResult => ({
  notices: [],
  corrupted: false,
  backupFailed: false,
  unavailable: false,
  newerVersion: false,
  ...over,
});

const renderHome = () =>
  renderWithRouter(React.createElement(TodayProvider, { value: '2026-10-09' }, React.createElement(Home)));

beforeEach(() => {
  loadMock.mockReset();
  mockNavigate.mockClear();
  mockLocation.state = null;
});

describe('Home', () => {
  it('고지서 등록을 누르면 등록 화면으로 이동한다', () => {
    loadMock.mockReturnValue(result({ notices: [open] }));
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '고지서 등록' }));
    expect(mockNavigate).toHaveBeenCalledWith('/notice/new');
  });

  it('손상이 아니면 unbacked-warning이 없다', () => {
    loadMock.mockReturnValue(result({ notices: [open] }));
    renderHome();
    expect(screen.queryAllByTestId('unbacked-warning')).toHaveLength(0);
    expect(screen.queryAllByTestId('saved-total')).toHaveLength(0);
  });
});
