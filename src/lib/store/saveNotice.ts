import { validateNotices } from '@/lib/noticeSchema';
import { INPUT_LIMITS } from '@/lib/fineRules';
import type { Notice, NoticeInput, StoreError } from '@/lib/types';
import { isBackedUp, readStoreState } from './loadNotices';
import { NOTICES_KEY, safeSet } from './storageCore';

export type SaveResult =
  | { ok: true; notice: Notice }
  | { ok: false; error: Exclude<StoreError, 'not_found'> };

export interface SaveOptions {
  resetRecord?: boolean;
  discardCorrupt?: boolean;
}

// crypto.randomUUID는 Android 7 WebView에 없어 쓰지 않는다(spec: 호환 불가 API 0건)
function newId(): string {
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** 신규(id 없음) 또는 수정(id 있음) 저장. throw하지 않는다. */
export function saveNotice(input: NoticeInput, id?: string, opts: SaveOptions = {}): SaveResult {
  try {
    const state = readStoreState();
    if (state.kind === 'unavailable') return { ok: false, error: 'unavailable' };
    if (state.kind === 'newer') return { ok: false, error: 'newer_version' };
    if (state.kind === 'corrupt' && !opts.discardCorrupt && !isBackedUp(state.raw)) {
      return { ok: false, error: 'unbacked' };
    }
    const current = state.kind === 'ok' ? state.notices : [];
    const now = new Date().toISOString();

    let notice: Notice;
    let list: Notice[];
    if (id === undefined) {
      if (current.length >= INPUT_LIMITS.MAX_NOTICES) return { ok: false, error: 'limit' };
      notice = {
        ...input,
        id: newId(),
        status: 'open',
        paidAmount: null,
        savedAmount: 0,
        decidedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      list = [...current, notice];
    } else {
      const old = current.find((n) => n.id === id);
      if (!old) return { ok: false, error: 'invalid' };
      const record = opts.resetRecord
        ? { status: 'open' as const, paidAmount: null, savedAmount: 0, decidedAt: null }
        : { status: old.status, paidAmount: old.paidAmount, savedAmount: old.savedAmount, decidedAt: old.decidedAt };
      notice = { ...input, ...record, id: old.id, createdAt: old.createdAt, updatedAt: now };
      list = current.map((n) => (n.id === id ? notice : n));
    }

    if (validateNotices({ version: 1, notices: list }) === null) return { ok: false, error: 'invalid' };
    const written = safeSet(NOTICES_KEY, JSON.stringify({ version: 1, notices: list }));
    if (!written.ok) return { ok: false, error: written.error };
    return { ok: true, notice };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}
