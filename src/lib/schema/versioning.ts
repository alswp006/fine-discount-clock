import { CURRENT_SCHEMA_VERSION, MIGRATIONS } from '@/lib/noticeSchema';
import type { NoticeMigrations } from '@/lib/noticeSchema';
import type { Notice } from '@/lib/types';
import { validateNotices } from './validateNotices';

export type VersionVerdict = 'corrupt' | 'migrate' | 'current' | 'newer';

/** version 값만 보고 처리 경로를 정한다. 정수가 아니거나 1 미만이면 손상. */
export function classifyVersion(version: unknown, current: number = CURRENT_SCHEMA_VERSION): VersionVerdict {
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return 'corrupt';
  if (version < current) return 'migrate';
  return version === current ? 'current' : 'newer';
}

/** fromVersion → toVersion을 한 단계씩 변환한다. 단계가 없거나 예외가 나면 null. */
export function migrateNoticesData(
  data: unknown,
  fromVersion: number,
  migrations: NoticeMigrations = MIGRATIONS,
  toVersion: number = CURRENT_SCHEMA_VERSION,
): unknown | null {
  try {
    let result = data;
    for (let v = fromVersion; v < toVersion; v++) {
      const step = migrations[v];
      if (typeof step !== 'function') return null;
      result = step(result);
    }
    return result;
  } catch {
    return null;
  }
}

export type StoredDataVerdict =
  | { kind: 'ok'; notices: Notice[]; migrated: boolean }
  | { kind: 'newer' }
  | { kind: 'corrupt' };

/** 저장소에서 파싱한 값을 판정한다. 변환 결과는 쓰지 않고 검증만 한다. */
export function classifyStoredData(parsed: unknown): StoredDataVerdict {
  const version = typeof parsed === 'object' && parsed !== null ? (parsed as { version?: unknown }).version : undefined;
  const verdict = classifyVersion(version);
  if (verdict === 'corrupt') return { kind: 'corrupt' };
  if (verdict === 'newer') return { kind: 'newer' };
  const data = verdict === 'migrate' ? migrateNoticesData(parsed, version as number) : parsed;
  const notices = data === null ? null : validateNotices(data);
  return notices === null ? { kind: 'corrupt' } : { kind: 'ok', notices, migrated: verdict === 'migrate' };
}
