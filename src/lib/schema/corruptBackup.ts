import { MAX_CORRUPT_BACKUPS } from '@/lib/noticeSchema';

export type CorruptBackupEntry = { raw: string };
export type CorruptBackupParse = { kind: 'ok'; backups: CorruptBackupEntry[] } | { kind: 'newer' };

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function isBackupList(v: unknown): v is CorruptBackupEntry[] {
  return (
    Array.isArray(v) &&
    v.length <= MAX_CORRUPT_BACKUPS &&
    v.every((e) => typeof e === 'object' && e !== null && typeof (e as { raw?: unknown }).raw === 'string')
  );
}

/** fdc:notices:corrupt 의 기존 값을 해석한다. 형식 밖의 값은 버리지 않고 항목 1개로 본다. */
export function parseCorruptBackup(raw: string | null): CorruptBackupParse {
  if (raw === null) return { kind: 'ok', backups: [] };
  const parsed = parseJson(raw);
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const { version, backups } = parsed as { version?: unknown; backups?: unknown };
    if (version === 1 && isBackupList(backups)) {
      return { kind: 'ok', backups: backups.map((b) => ({ raw: b.raw })) };
    }
    if (typeof version === 'number' && Number.isInteger(version) && version > 1) return { kind: 'newer' };
  }
  return { kind: 'ok', backups: [{ raw }] };
}
