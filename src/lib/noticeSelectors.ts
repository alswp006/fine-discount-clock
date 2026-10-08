import { calcFineComparison, currentDueAmount, getKeyDeadline, getLastDeadline, potentialSaving } from '@/lib/fineEngine';
import { formatDateDot, formatDday, formatWon } from '@/lib/format';
import type { KeyDeadline, Notice } from '@/lib/types';

/** 마감 임박 배지 기준(D-0~D-3) — 법정 기준이 아닌 UI 표시 기준 */
const URGENT_DAYS = 3;

export type OpenBadge = '마감 임박' | '기한 지남' | null;

export interface OpenCard {
  id: string;
  notice: Notice;
  deadline: KeyDeadline | null;
  /** 'D-2' */
  ddayText: string;
  /** '감경 마감' / 기한이 지났으면 '납부기한 지남 · D+1' */
  deadlineText: string;
  badge: OpenBadge;
  /** 지금 낼 금액. 과태료 납부기한이 지났으면 '41,200원부터' */
  dueText: string;
}

export interface SavingsHero {
  total: number;
  count: number;
  urgentName: string;
  urgentDday: string;
}

export interface DecidedRow {
  id: string;
  name: string;
  /** '감경 납부 · 32,000원' */
  text: string;
}

export interface DecidedSection {
  rows: DecidedRow[];
  savedTotal: number;
}

function badgeFor(dday: number | null): OpenBadge {
  if (dday === null) return null;
  if (dday < 0) return '기한 지남';
  if (dday <= URGENT_DAYS) return '마감 임박';
  return null;
}

function toCard(notice: Notice, today: string): OpenCard {
  const key = getKeyDeadline(notice, today);
  const deadline = key ?? getLastDeadline(notice, today);
  const passed = key === null && deadline !== null;
  const due = currentDueAmount(notice, today);
  const open = deadline === null ? '' : passed ? `${deadline.label} 지남 · ${formatDday(deadline.dday)}` : deadline.label;
  return {
    id: notice.id,
    notice,
    deadline,
    ddayText: deadline === null ? '' : formatDday(deadline.dday),
    deadlineText: open,
    badge: badgeFor(deadline === null ? null : deadline.dday),
    dueText: notice.kind === 'fine' && passed ? `${formatWon(due)}부터` : formatWon(due),
  };
}

function compareCards(a: OpenCard, b: OpenCard): number {
  const da = a.deadline === null ? Number.POSITIVE_INFINITY : a.deadline.dday;
  const db = b.deadline === null ? Number.POSITIVE_INFINITY : b.deadline.dday;
  if (da !== db) return da < db ? -1 : 1;
  if (a.notice.createdAt === b.notice.createdAt) return 0;
  return a.notice.createdAt < b.notice.createdAt ? -1 : 1;
}

/** open 고지서만 D-day 오름차순(지난 기한이 맨 위), 같으면 등록순 */
export function buildOpenCards(notices: Notice[], today: string): OpenCard[] {
  return notices
    .filter((n) => n.status === 'open')
    .map((n) => toCard(n, today))
    .sort(compareCards);
}

/** 기한 안에 내면 아끼는 돈 합계·장수·가장 급한 건. open이 0건이면 null */
export function buildSavingsHero(notices: Notice[], today: string): SavingsHero | null {
  const cards = buildOpenCards(notices, today);
  if (cards.length === 0) return null;
  const total = cards.reduce((sum, c) => sum + potentialSaving(c.notice, today), 0);
  const urgent = cards[0];
  return { total, count: cards.length, urgentName: urgent.notice.name, urgentDday: urgent.ddayText };
}

function decidedText(n: Notice): string {
  const paid = formatWon(n.paidAmount ?? 0);
  switch (n.status) {
    case 'paid_early': {
      const isDiscountPaid =
        n.kind === 'fine' && n.opinionDeadline !== null && n.paidAmount === calcFineComparison(n).discounted;
      return `${isDiscountPaid ? '감경 납부' : '기한 내 납부'} · ${paid}`;
    }
    case 'paid_late':
      return `기한 후 납부 · ${paid}`;
    case 'objected':
      return n.paymentDeadline
        ? `의견제출 · 결과 기다리는 중 · 납부기한 ${formatDateDot(n.paymentDeadline)}`
        : '의견제출 · 결과 기다리는 중';
    default:
      return '';
  }
}

function compareDesc(a: string, b: string): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

/** 정리한 고지서(open 제외): decidedAt 내림차순, 같으면 updatedAt 내림차순. savedTotal은 전체 savedAmount 합 */
export function buildDecidedSection(notices: Notice[]): DecidedSection {
  const rows = notices
    .filter((n) => n.status !== 'open')
    .sort((a, b) => compareDesc(a.decidedAt ?? '', b.decidedAt ?? '') || compareDesc(a.updatedAt, b.updatedAt))
    .map((n) => ({ id: n.id, name: n.name, text: decidedText(n) }));
  const savedTotal = notices.reduce((sum, n) => sum + n.savedAmount, 0);
  return { rows, savedTotal };
}
