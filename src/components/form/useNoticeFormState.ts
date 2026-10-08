import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { NoticeInput } from '@/lib/types';
import type { NoticeFormErrors, NoticeFormValues } from '@/lib/noticeFormValidation';

const EMPTY: NoticeFormValues = {
  name: '',
  kind: 'fine',
  amount: 0,
  discountedAmount: null,
  receivedDate: '',
  opinionDeadline: '',
  paymentDeadline: '',
};

function fromInput(initial?: NoticeInput): NoticeFormValues {
  if (!initial) return EMPTY;
  return {
    name: initial.name,
    kind: initial.kind,
    amount: initial.amount,
    discountedAmount: initial.discountedAmount,
    receivedDate: initial.receivedDate,
    opinionDeadline: initial.opinionDeadline ?? '',
    paymentDeadline: initial.paymentDeadline ?? '',
  };
}

export interface NoticeFormState {
  values: NoticeFormValues;
  errors: NoticeFormErrors;
  /** 값을 바꾸고 그 필드의 오류 문구만 지운다. 다른 필드 문구는 다음 검증까지 남는다. */
  setValue: <K extends keyof NoticeFormValues>(field: K, value: NoticeFormValues[K]) => void;
  setErrors: Dispatch<SetStateAction<NoticeFormErrors>>;
}

/** 등록·수정 폼의 값과 필드별 오류. 수정 모드는 저장값을 initial로 준다. */
export function useNoticeFormState(initial?: NoticeInput): NoticeFormState {
  const [values, setValues] = useState<NoticeFormValues>(() => fromInput(initial));
  const [errors, setErrors] = useState<NoticeFormErrors>({});

  const setValue = useCallback<NoticeFormState['setValue']>((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      // 'kind'처럼 오류 칸이 없는 필드도 들어오므로 키 이름으로만 본다.
      const key: string = field;
      if (!(key in prev)) return prev;
      return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key));
    });
  }, []);

  return { values, errors, setValue, setErrors };
}
