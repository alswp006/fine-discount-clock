import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@toss/tds-mobile';
import { logClick } from '@/lib/analytics';
import { storeErrorMessage } from '@/lib/messages';
import { saveNotice } from '@/lib/noticeStore';
import type { SaveResult } from '@/lib/noticeStore';
import { toNoticeInput, validateNoticeForm } from '@/lib/noticeFormValidation';
import { useToday } from '@/lib/TodayContext';
import type { NoticeInput, RouteState } from '@/lib/types';
import type { FocusRequest } from '@/components/form/NoticeFormFields';
import type { NoticeFormState } from '@/components/form/useNoticeFormState';

const AMOUNT_NO_DIGIT = '금액을 숫자로 입력해주세요';
const SAVED_MESSAGE = '고지서를 등록했어요';

/**
 * 등록 제출 흐름 — 검증 → saveNotice → 오류 코드별 Toast.
 * 'unbacked'이면 이동 없이 확인 다이얼로그를 띄우고, 확인하면 discardCorrupt로 다시 저장한다.
 */
export function useNoticeSubmit(formState: NoticeFormState) {
  const { values, errors, setErrors } = formState;
  const today = useToday();
  const navigate = useNavigate();
  const { openToast } = useToast();

  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [unbackedOpen, setUnbackedOpen] = useState(false);
  const pending = useRef<NoticeInput | null>(null);
  const seq = useRef(0);

  const finish = useCallback(
    (res: SaveResult): 'saved' | 'unbacked' | 'failed' => {
      if (res.ok) {
        openToast(SAVED_MESSAGE);
        const state: RouteState = { justSaved: true };
        navigate(`/notice/${res.notice.id}`, { state });
        return 'saved';
      }
      if (res.error === 'unbacked') return 'unbacked';
      openToast(storeErrorMessage(res.error));
      return 'failed';
    },
    [navigate, openToast],
  );

  const submit = useCallback(() => {
    const validation = validateNoticeForm(values, today, 'create');
    const next = { ...validation.errors };
    // 입력이 거부된 채 빈 금액 칸이면 거부 문구를 '숫자' 안내로 바꾼다(F2-AC-11)
    if (errors.amount !== undefined && values.amount === 0 && next.amount !== undefined) {
      next.amount = AMOUNT_NO_DIGIT;
    }
    setErrors(next);

    if (validation.firstErrorField !== undefined) {
      seq.current += 1;
      setFocusRequest({ field: validation.firstErrorField, seq: seq.current });
      return;
    }

    logClick('notice_save');
    const input = toNoticeInput(values);
    const outcome = finish(saveNotice(input));
    if (outcome === 'unbacked') {
      pending.current = input;
      setUnbackedOpen(true);
    }
  }, [values, errors.amount, today, setErrors, finish]);

  const confirmDiscard = useCallback(() => {
    setUnbackedOpen(false);
    const input = pending.current;
    pending.current = null;
    if (!input) return;
    finish(saveNotice(input, undefined, { discardCorrupt: true }));
  }, [finish]);

  const closeUnbacked = useCallback(() => {
    pending.current = null;
    setUnbackedOpen(false);
  }, []);

  return { submit, focusRequest, unbackedOpen, confirmDiscard, closeUnbacked };
}
