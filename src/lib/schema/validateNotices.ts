import { INPUT_LIMITS } from '@/lib/fineRules';
import { addYears, countChars, isValidYmd } from '@/lib/inputRules';
import type { Notice, NoticeKind, NoticeStatus } from '@/lib/types';

const KINDS: readonly NoticeKind[] = ['fine', 'penalty'];
const STATUSES: readonly NoticeStatus[] = ['open', 'paid_early', 'paid_late', 'objected'];
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

function isYmd(v: unknown): v is string {
  return typeof v === 'string' && isValidYmd(v);
}

function isNullOrYmd(v: unknown): boolean {
  return v === null || isYmd(v);
}

function isTimestamp(v: unknown): boolean {
  return typeof v === 'string' && ISO_TIMESTAMP.test(v) && !Number.isNaN(Date.parse(v));
}

function isValidName(v: unknown): boolean {
  if (typeof v !== 'string' || v !== v.trim()) return false;
  const n = countChars(v);
  return n >= 1 && n <= INPUT_LIMITS.NAME_MAX_CHARS;
}

function isDeadlineInRange(deadline: string | null, received: string): boolean {
  if (deadline === null) return true;
  return deadline >= received && deadline <= addYears(received, INPUT_LIMITS.DEADLINE_MAX_YEARS_AFTER_RECEIVED);
}

function hasValidFormat(n: Record<string, unknown>): boolean {
  if (typeof n.id !== 'string' || n.id === '') return false;
  if (!isValidName(n.name)) return false;
  if (!KINDS.includes(n.kind as NoticeKind) || !STATUSES.includes(n.status as NoticeStatus)) return false;
  if (!isInt(n.amount) || n.amount < INPUT_LIMITS.AMOUNT_MIN || n.amount > INPUT_LIMITS.AMOUNT_MAX) return false;
  if (n.discountedAmount !== null) {
    if (!isInt(n.discountedAmount) || n.discountedAmount < 1 || n.discountedAmount >= n.amount) return false;
  }
  if (!isYmd(n.receivedDate)) return false;
  if (!isNullOrYmd(n.opinionDeadline) || !isNullOrYmd(n.paymentDeadline) || !isNullOrYmd(n.decidedAt)) return false;
  if (n.paidAmount !== null && !isInt(n.paidAmount)) return false;
  if (!isInt(n.savedAmount) || n.savedAmount < 0) return false;
  return isTimestamp(n.createdAt) && isTimestamp(n.updatedAt);
}

function hasValidInvariants(n: Notice): boolean {
  if (n.kind === 'fine') {
    if (n.opinionDeadline === null && n.paymentDeadline === null) return false;
  } else if (n.opinionDeadline !== null || n.discountedAmount !== null || n.status === 'objected') {
    return false;
  }
  if (!isDeadlineInRange(n.opinionDeadline, n.receivedDate)) return false;
  if (!isDeadlineInRange(n.paymentDeadline, n.receivedDate)) return false;
  if (n.opinionDeadline !== null && n.paymentDeadline !== null && n.opinionDeadline > n.paymentDeadline) {
    return false;
  }
  switch (n.status) {
    case 'open':
      return n.paidAmount === null && n.savedAmount === 0 && n.decidedAt === null;
    case 'paid_early':
      return n.paidAmount !== null && n.paidAmount >= 1 && n.decidedAt !== null;
    case 'paid_late':
      return n.paidAmount !== null && n.paidAmount >= 1 && n.savedAmount === 0 && n.decidedAt !== null;
    case 'objected':
      return n.paidAmount === null && n.savedAmount === 0 && n.decidedAt !== null;
  }
}

/** 로드 검증 규칙 전체. 하나라도 어기면 null. 오늘 날짜에는 의존하지 않고 throw하지 않는다. */
export function validateNotices(data: unknown): Notice[] | null {
  try {
    if (!isRecord(data) || !Array.isArray(data.notices)) return null;
    const list: unknown[] = data.notices;
    if (list.length > INPUT_LIMITS.MAX_NOTICES) return null;
    const ids = new Set<string>();
    for (const item of list) {
      if (!isRecord(item) || !hasValidFormat(item)) return null;
      const notice = item as unknown as Notice;
      if (ids.has(notice.id) || !hasValidInvariants(notice)) return null;
      ids.add(notice.id);
    }
    return list as Notice[];
  } catch {
    return null;
  }
}
