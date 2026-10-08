export type StorageFailure = 'quota' | 'unavailable';

export type SafeGet = { ok: true; value: string | null } | { ok: false };
export type SafeSet = { ok: true } | { ok: false; error: StorageFailure };

export const NOTICES_KEY = 'fdc:notices:v1';
export const CORRUPT_KEY = 'fdc:notices:corrupt';

const QUOTA_NAMES: readonly string[] = ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'];
const QUOTA_CODES: readonly number[] = [22, 1014];

/** 저장 공간 부족이면 'quota', 그 밖의 예외(SecurityError 등)는 'unavailable' */
export function classifyStorageError(e: unknown): StorageFailure {
  if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
    if (QUOTA_NAMES.includes(e.name) || QUOTA_CODES.includes(e.code)) return 'quota';
  }
  return 'unavailable';
}

export function safeGet(key: string): SafeGet {
  try {
    return { ok: true, value: localStorage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

export function safeSet(key: string, value: string): SafeSet {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: classifyStorageError(e) };
  }
}
