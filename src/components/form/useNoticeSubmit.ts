import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@toss/tds-mobile';
import { logClick } from '@/lib/analytics';
import { storeErrorMessage } from '@/lib/messages';
import { saveNotice } from '@/lib/noticeStore';
import type { SaveOptions, SaveResult } from '@/lib/noticeStore';
import { hasRecordResetChange, toNoticeInput, validateNoticeForm } from '@/lib/noticeFormValidation';
import { useToday } from '@/lib/TodayContext';
import type { Notice, NoticeInput, RouteState } from '@/lib/types';
import type { FocusRequest } from '@/components/form/NoticeFormFields';
import type { NoticeFormState } from '@/components/form/useNoticeFormState';

const AMOUNT_NO_DIGIT = '금액을 숫자로 입력해주세요';
const CREATED_MESSAGE = '고지서를 등록했어요';
const UPDATED_MESSAGE = '고지서를 수정했어요';

/** 수정 모드 — 저장돼 있던 고지서. 없으면 등록이다. */
export interface EditTarget {
  id: string;
  original: Notice;
}

/**
 * 제출 흐름 — 검증 → saveNotice → 오류 코드별 Toast.
 * 'unbacked'이면 이동 없이 확인 다이얼로그를 띄우고, 확인하면 discardCorrupt로 다시 저장한다.
 * 수정 모드에서 납부 기록이 있는 고지서의 금액·기한이 바뀌면 resetOpen으로 확인을 받은 뒤 open으로 되돌려 저장한다.
 */
export function useNoticeSubmit(formState: NoticeFormState, edit?: EditTarget) {
  const { values, errors, setErrors } = formState;
  const today = useToday();
  const navigate = useNavigate();
  const { openToast } = useToast();
  const editId = edit?.id;
  const original = edit?.original;

  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [unbackedOpen, setUnbackedOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const pending = useRef<{ input: NoticeInput; opts: SaveOptions } | null>(null);
  const seq = useRef(0);

  const finish = useCallback(
    (res: SaveResult): 'saved' | 'unbacked' | 'failed' => {
      if (res.ok) {
        openToast(editId === undefined ? CREATED_MESSAGE : UPDATED_MESSAGE);
        const state: RouteState = { justSaved: true };
        navigate(`/notice/${res.notice.id}`, { state, replace: true });
        return 'saved';
      }
      if (res.error === 'unbacked') return 'unbacked';
      openToast(storeErrorMessage(res.error));
      return 'failed';
    },
    [navigate, openToast, editId],
  );

  const persist = useCallback(
    (input: NoticeInput, opts: SaveOptions) => {
      const outcome = finish(saveNotice(input, editId, opts));
      if (outcome === 'unbacked') {
        pending.current = { input, opts };
        setUnbackedOpen(true);
      }
    },
    [finish, editId],
  );

  const submit = useCallback(() => {
    const validation = validateNoticeForm(
      values,
      today,
      editId === undefined ? 'create' : 'edit',
      { originalReceivedDate: original?.receivedDate },
    );
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
    if (original && original.status !== 'open' && hasRecordResetChange(original, input)) {
      pending.current = { input, opts: { resetRecord: true } };
      setResetOpen(true);
      return;
    }
    persist(input, {});
  }, [values, errors.amount, today, editId, original, setErrors, persist]);

  const confirmReset = useCallback(() => {
    setResetOpen(false);
    const job = pending.current;
    pending.current = null;
    if (!job) return;
    persist(job.input, job.opts);
  }, [persist]);

  const closeReset = useCallback(() => {
    pending.current = null;
    setResetOpen(false);
  }, []);

  const confirmDiscard = useCallback(() => {
    setUnbackedOpen(false);
    const job = pending.current;
    pending.current = null;
    if (!job) return;
    finish(saveNotice(job.input, editId, { ...job.opts, discardCorrupt: true }));
  }, [finish, editId]);

  const closeUnbacked = useCallback(() => {
    pending.current = null;
    setUnbackedOpen(false);
  }, []);

  return {
    submit,
    focusRequest,
    unbackedOpen,
    confirmDiscard,
    closeUnbacked,
    resetOpen,
    confirmReset,
    closeReset,
  };
}
