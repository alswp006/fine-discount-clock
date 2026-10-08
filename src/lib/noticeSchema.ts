import type { Notice } from '@/lib/types';

export const CURRENT_SCHEMA_VERSION = 1;
/** 법정 기준 아님, 앱 저장 용량 제한 */
export const MAX_CORRUPT_BACKUPS = 3;
export const STORAGE_LIMITS = { MAX_CORRUPT_BACKUPS } as const;

export interface NoticesData {
  version: 1;
  notices: Notice[];
}
export interface CorruptBackup {
  version: 1;
  backups: { raw: string }[];
}
/** key n: vn → vn+1 */
export type NoticeMigrations = Record<number, (data: unknown) => unknown>;
export const MIGRATIONS: NoticeMigrations = {};

export { validateNotices } from '@/lib/schema/validateNotices';
export { classifyVersion, classifyStoredData, migrateNoticesData } from '@/lib/schema/versioning';
export type { VersionVerdict, StoredDataVerdict } from '@/lib/schema/versioning';
export { parseCorruptBackup } from '@/lib/schema/corruptBackup';
export type { CorruptBackupEntry, CorruptBackupParse } from '@/lib/schema/corruptBackup';
