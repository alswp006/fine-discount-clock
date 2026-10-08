import { MAX_CORRUPT_BACKUPS, classifyStoredData, parseCorruptBackup } from '@/lib/noticeSchema';
import type { LoadResult, Notice } from '@/lib/types';
import { CORRUPT_KEY, NOTICES_KEY, safeGet, safeSet } from './storageCore';

/** 저장소의 현재 상태. raw는 손상으로 판정된 원문 */
export type StoreState =
  | { kind: 'ok'; notices: Notice[] }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'newer' }
  | { kind: 'unavailable' };

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

/** 쓰지 않고 읽기만 한다. 저장·상태 기록 함수가 같은 판정을 쓰도록 공유한다. */
export function readStoreState(): StoreState {
  const got = safeGet(NOTICES_KEY);
  if (!got.ok) return { kind: 'unavailable' };
  if (got.value === null) return { kind: 'ok', notices: [] };
  const parsed = parseJson(got.value);
  if (!parsed.ok) return { kind: 'corrupt', raw: got.value };
  const verdict = classifyStoredData(parsed.value);
  if (verdict.kind === 'newer') return { kind: 'newer' };
  if (verdict.kind === 'corrupt') return { kind: 'corrupt', raw: got.value };
  return { kind: 'ok', notices: verdict.notices };
}

/** 손상 원문이 백업 키에 이미 있는지 */
export function isBackedUp(raw: string): boolean {
  const got = safeGet(CORRUPT_KEY);
  if (!got.ok) return false;
  const parsed = parseCorruptBackup(got.value);
  return parsed.kind === 'ok' && parsed.backups.some((b) => b.raw === raw);
}

/** 백업 키에 원문을 쌓는다. 쌓지 못하면 false (이 키에 쓰는 함수는 이것뿐이다) */
function appendBackup(raw: string): boolean {
  const got = safeGet(CORRUPT_KEY);
  if (!got.ok) return false;
  const parsed = parseCorruptBackup(got.value);
  if (parsed.kind === 'newer') return false;
  if (parsed.backups.some((b) => b.raw === raw)) return true;
  if (parsed.backups.length >= MAX_CORRUPT_BACKUPS) return false;
  const next = { version: 1, backups: [...parsed.backups, { raw }] };
  return safeSet(CORRUPT_KEY, JSON.stringify(next)).ok;
}

export function loadNotices(): LoadResult {
  const result: LoadResult = {
    notices: [],
    corrupted: false,
    backupFailed: false,
    unavailable: false,
    newerVersion: false,
  };
  try {
    const state = readStoreState();
    if (state.kind === 'ok') return { ...result, notices: state.notices };
    if (state.kind === 'unavailable') return { ...result, unavailable: true };
    if (state.kind === 'newer') return { ...result, newerVersion: true };
    return { ...result, corrupted: true, backupFailed: !appendBackup(state.raw) };
  } catch {
    return { ...result, unavailable: true };
  }
}
