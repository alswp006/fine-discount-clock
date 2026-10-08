import { useCallback, useMemo } from 'react';
import { useToast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { logClick } from '@/lib/analytics';
import { currentDueAmount, getKeyDeadline, getLastDeadline, potentialSaving } from '@/lib/fineEngine';
import { formatWon } from '@/lib/format';
import { updateStatus } from '@/lib/noticeStore';
import { requestReviewOnce } from '@/lib/review';
import { useToday } from '@/lib/TodayContext';
import type { Notice, NoticeStatus, StoreError } from '@/lib/types';

export interface RecordOption {
  key: string;
  label: string;
  status: NoticeStatus;
  /** 성공했을 때 남기는 클릭 로그 이름 — 한 번 정하면 바꾸지 않는다 */
  logName: string;
  /** 성공했을 때 Toast 문구 */
  doneMessage: string;
}

const RESTART_HINT = '기록하지 못했어요. 토스 앱을 다시 실행한 뒤 시도해 주세요';

const RECORD_ERROR_MESSAGES: Record<StoreError, string> = {
  quota: '저장 공간이 부족해 기록하지 못했어요',
  unavailable: '저장 공간에 접근할 수 없어 기록하지 못했어요',
  newer_version: RESTART_HINT,
  not_found: '고지서를 찾을 수 없어 기록하지 못했어요',
  limit: '기록하지 못했어요. 잠시 뒤 다시 시도해 주세요',
  unbacked: '기록하지 못했어요. 잠시 뒤 다시 시도해 주세요',
  invalid: RESTART_HINT,
};

function fireHaptic(type: 'success' | 'tickWeak'): void {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저·jsdom)에서는 throw — 무시 */
  }
}

const PAID_DONE = '납부를 기록했어요';

function earlyDoneMessage(notice: Notice, today: string): string {
  const saving = potentialSaving(notice, today);
  return saving > 0 ? `감경 납부를 기록했어요. ${formatWon(saving)} 아꼈어요` : PAID_DONE;
}

function paymentOption(notice: Notice, today: string): RecordOption {
  const base: Notice = { ...notice, status: 'open' };
  const due = formatWon(currentDueAmount(base, today));
  const key = getKeyDeadline(base, today);

  if (key) {
    const early = (label: string): RecordOption => ({
      key: 'paid_early',
      label,
      status: 'paid_early',
      logName: 'mark_paid_early',
      doneMessage: earlyDoneMessage(base, today),
    });
    if (key.label === '감경 마감') return early(`감경가 ${due}으로 납부했어요`);
    if (key.label === '1차 납부기한') return early(`1차 기한 안에 ${due} 납부했어요`);
    if (key.label === '2차 납부기한') return early(`2차 기한 안에 ${due} 납부했어요`);
    return early(`기한 안에 ${due} 납부했어요`);
  }

  // 남은 기한이 없다: 납부기한이 없는 과태료(감경 마감만 지남)는 아직 기한 안이다
  const last = getLastDeadline(base, today);
  if (last && last.label !== '감경 마감') {
    return {
      key: 'paid_late',
      label: `기한 지나서 ${due} 납부했어요`,
      status: 'paid_late',
      logName: 'mark_paid_late',
      doneMessage: PAID_DONE,
    };
  }
  return {
    key: 'paid_early',
    label: `기한 안에 ${due} 납부했어요`,
    status: 'paid_early',
    logName: 'mark_paid_early',
    doneMessage: earlyDoneMessage(base, today),
  };
}

/** 시점별 기록 옵션. 범칙금은 의견제출(objected)이 없다. */
export function buildRecordOptions(notice: Notice, today: string): RecordOption[] {
  const options: RecordOption[] = [paymentOption(notice, today)];
  if (notice.kind === 'fine') {
    options.push({
      key: 'objected',
      label: '의견제출을 했어요',
      status: 'objected',
      logName: 'mark_objected',
      doneMessage: '의견제출을 기록했어요',
    });
  }
  options.push({
    key: 'open',
    label: '아직 결정 안 했어요',
    status: 'open',
    logName: 'mark_open',
    doneMessage: '아직 결정 안 한 상태로 돌려놨어요',
  });
  return options;
}

/**
 * 납부·결정 기록 동작. 저장소(updateStatus)가 금액·절감액을 엔진으로 계산해 남긴다.
 * 성공했을 때만 햅틱·클릭 로그·리뷰 요청·성공 Toast를 내고, 실패하면 실패 Toast만 낸다.
 */
export function useRecordActions(notice: Notice, onRecorded?: () => void) {
  const today = useToday();
  const { openToast } = useToast();
  const options = useMemo(() => buildRecordOptions(notice, today), [notice, today]);

  const record = useCallback(
    (option: RecordOption): boolean => {
      fireHaptic('tickWeak');
      const res = updateStatus(notice.id, option.status, today);
      if (!res.ok) {
        openToast(RECORD_ERROR_MESSAGES[res.error]);
        return false;
      }
      fireHaptic('success');
      logClick(option.logName);
      // 감경 등 기한 안에 낸 납부만 — 기한 지나 낸 납부·의견제출·되돌리기는 만족 순간이 아니다
      if (option.status === 'paid_early' && res.notice.savedAmount > 0) requestReviewOnce();
      openToast(option.doneMessage);
      onRecorded?.();
      return true;
    },
    [notice.id, today, openToast, onRecorded],
  );

  return { options, record };
}
