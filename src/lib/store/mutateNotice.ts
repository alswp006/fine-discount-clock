import { currentDueAmount, potentialSaving } from '@/lib/fineEngine';
import { validateNotices } from '@/lib/noticeSchema';
import type { Notice, NoticeStatus } from '@/lib/types';
import { readStoreState } from './loadNotices';
import { NOTICES_KEY, safeSet } from './storageCore';

export type UpdateStatusResult =
  | { ok: true; notice: Notice }
  | { ok: false; error: 'quota' | 'not_found' | 'unavailable' | 'newer_version' | 'invalid' };

export type DeleteResult =
  | { ok: true }
  | { ok: false; error: 'quota' | 'not_found' | 'unavailable' | 'newer_version' };

type Found = { ok: true; notices: Notice[]; target: Notice } | { ok: false; error: 'not_found' | 'unavailable' | 'newer_version' };

function findTarget(id: string): Found {
  const state = readStoreState();
  if (state.kind === 'unavailable') return { ok: false, error: 'unavailable' };
  if (state.kind === 'newer') return { ok: false, error: 'newer_version' };
  const notices = state.kind === 'ok' ? state.notices : [];
  const target = notices.find((n) => n.id === id);
  return target ? { ok: true, notices, target } : { ok: false, error: 'not_found' };
}

function recordFor(target: Notice, status: NoticeStatus, today: string) {
  // 기록 직전 값: status를 open으로 보고 계산한다
  const base: Notice = { ...target, status: 'open' };
  switch (status) {
    case 'paid_early':
      return { status, paidAmount: currentDueAmount(base, today), savedAmount: potentialSaving(base, today), decidedAt: today };
    case 'paid_late':
      return { status, paidAmount: currentDueAmount(base, today), savedAmount: 0, decidedAt: today };
    case 'objected':
      return { status, paidAmount: null, savedAmount: 0, decidedAt: today };
    case 'open':
      return { status, paidAmount: null, savedAmount: 0, decidedAt: null };
  }
}

/** 대상 1건의 처리 상태와 기록값을 바꾼다. throw하지 않는다. */
export function updateStatus(id: string, status: NoticeStatus, today: string): UpdateStatusResult {
  try {
    const found = findTarget(id);
    if (!found.ok) return found;
    const notice: Notice = {
      ...found.target,
      ...recordFor(found.target, status, today),
      updatedAt: new Date().toISOString(),
    };
    const list = found.notices.map((n) => (n.id === id ? notice : n));
    if (validateNotices({ version: 1, notices: list }) === null) return { ok: false, error: 'invalid' };
    const written = safeSet(NOTICES_KEY, JSON.stringify({ version: 1, notices: list }));
    return written.ok ? { ok: true, notice } : { ok: false, error: written.error };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

/** 대상 1건을 지운다. 남은 고지서는 그대로 둔다. throw하지 않는다. */
export function deleteNotice(id: string): DeleteResult {
  try {
    const found = findTarget(id);
    if (!found.ok) return found;
    const list = found.notices.filter((n) => n.id !== id);
    const written = safeSet(NOTICES_KEY, JSON.stringify({ version: 1, notices: list }));
    return written.ok ? { ok: true } : { ok: false, error: written.error };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}
