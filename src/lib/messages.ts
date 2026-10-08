import type { StoreError } from '@/lib/types';

const STORE_ERROR_MESSAGES: Record<StoreError, string> = {
  quota: '저장 공간이 부족해 저장하지 못했어요',
  limit: '고지서는 50장까지 등록할 수 있어요',
  invalid: '입력값을 다시 확인해 주세요',
  unavailable: '저장 공간에 접근할 수 없어 저장하지 못했어요',
  newer_version: '새 버전 앱에서 저장한 데이터가 있어 저장하지 못했어요',
  not_found: '고지서를 찾을 수 없어요',
  unbacked: '이전 데이터를 백업하지 못해 저장하지 못했어요',
};

/** 저장소 오류 코드 → Toast 문구 */
export function storeErrorMessage(error: StoreError): string {
  return STORE_ERROR_MESSAGES[error];
}
