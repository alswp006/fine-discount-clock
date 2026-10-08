import type { NoticeInput, NoticeKind } from '@/lib/types';
import { INPUT_LIMITS } from '@/lib/fineRules';
import { addYears, countChars, isValidYmd } from '@/lib/inputRules';

/** 폼이 들고 있는 값 — 날짜는 비우면 '', 금액은 비우면 0, 감경 금액은 비우면 null. */
export interface NoticeFormValues {
  name: string;
  kind: NoticeKind;
  amount: number;
  discountedAmount: number | null;
  receivedDate: string;
  opinionDeadline: string;
  paymentDeadline: string;
}

export type NoticeFieldKey =
  | 'name'
  | 'amount'
  | 'discountedAmount'
  | 'receivedDate'
  | 'opinionDeadline'
  | 'paymentDeadline';

export type NoticeFormErrors = Partial<Record<NoticeFieldKey, string>>;

export interface NoticeFormValidation {
  errors: NoticeFormErrors;
  firstErrorField: NoticeFieldKey | undefined;
}

/** 화면 순서 — 첫 오류 필드를 고르는 기준이다. */
export const FIELD_ORDER: readonly NoticeFieldKey[] = [
  'name',
  'amount',
  'discountedAmount',
  'receivedDate',
  'opinionDeadline',
  'paymentDeadline',
];

const MSG = {
  nameEmpty: '고지서 이름을 입력해주세요',
  nameLong: `이름은 ${INPUT_LIMITS.NAME_MAX_CHARS}자 이내로 입력해주세요`,
  amountMin: '금액을 1,000원 이상 입력해주세요',
  amountMax: '금액은 1,000만원 이하로 입력해주세요',
  discountMin: '감경 금액은 1원 이상 입력해주세요',
  discountMax: '감경 금액은 원래 금액보다 작아야 해요',
  receivedEmpty: '고지서 받은 날을 입력해주세요',
  invalidDate: '올바른 날짜를 입력해주세요',
  receivedFuture: '받은 날은 오늘 이후일 수 없어요',
  receivedOld: `받은 날은 최근 ${INPUT_LIMITS.RECEIVED_MAX_YEARS_AGO}년 안의 날짜로 입력해주세요`,
  deadlineNone: '의견제출 기한이나 납부기한 중 하나를 입력해주세요',
  deadlineBeforeReceived: '기한은 받은 날 이후여야 해요',
  firstBeforeReceived: '1차 납부기한은 받은 날 이후여야 해요',
  paymentBeforeOpinion: '납부기한은 의견제출 기한 이후여야 해요',
  deadlineTooLate: `기한은 받은 날로부터 ${INPUT_LIMITS.DEADLINE_MAX_YEARS_AFTER_RECEIVED}년 안으로 입력해주세요`,
} as const;

export interface ValidateOptions {
  /** 수정 모드에서 저장돼 있던 받은 날 — 바꾸지 않았으면 5년 하한 검사를 건너뛴다. */
  originalReceivedDate?: string;
}

/**
 * 필드마다 문구 1개만 돌려준다(우선순위는 SPEC F2-AC-14).
 * 받은 날이 유효하지 않으면 받은 날과 비교하는 기한 검사는 하지 않는다.
 */
export function validateNoticeForm(
  values: NoticeFormValues,
  today: string,
  mode: 'create' | 'edit',
  options: ValidateOptions = {},
): NoticeFormValidation {
  const errors: NoticeFormErrors = {};
  const isFine = values.kind === 'fine';

  const nameChars = countChars(values.name);
  if (nameChars === 0) errors.name = MSG.nameEmpty;
  else if (nameChars > INPUT_LIMITS.NAME_MAX_CHARS) errors.name = MSG.nameLong;

  const amountOk = Number.isFinite(values.amount) && values.amount >= INPUT_LIMITS.AMOUNT_MIN && values.amount <= INPUT_LIMITS.AMOUNT_MAX;
  if (!Number.isFinite(values.amount) || values.amount < INPUT_LIMITS.AMOUNT_MIN) errors.amount = MSG.amountMin;
  else if (values.amount > INPUT_LIMITS.AMOUNT_MAX) errors.amount = MSG.amountMax;

  const discounted = values.discountedAmount;
  if (isFine && discounted !== null) {
    if (!Number.isFinite(discounted) || discounted < 1) errors.discountedAmount = MSG.discountMin;
    else if (amountOk && discounted >= values.amount) errors.discountedAmount = MSG.discountMax;
  }

  const received = values.receivedDate;
  const receivedValid = isValidYmd(received);
  if (received === '') errors.receivedDate = MSG.receivedEmpty;
  else if (!receivedValid) errors.receivedDate = MSG.invalidDate;
  else if (received > today) errors.receivedDate = MSG.receivedFuture;
  else {
    const unchanged = mode === 'edit' && options.originalReceivedDate === received;
    if (!unchanged && received < addYears(today, -INPUT_LIMITS.RECEIVED_MAX_YEARS_AGO)) {
      errors.receivedDate = MSG.receivedOld;
    }
  }

  const opinion = isFine ? values.opinionDeadline : '';
  const payment = values.paymentDeadline;
  const opinionValid = opinion !== '' && isValidYmd(opinion);
  const latest = receivedValid ? addYears(received, INPUT_LIMITS.DEADLINE_MAX_YEARS_AFTER_RECEIVED) : '';

  if (isFine) {
    if (opinion !== '' && !opinionValid) errors.opinionDeadline = MSG.invalidDate;
    else if (opinion === '' && payment === '') errors.opinionDeadline = MSG.deadlineNone;
    else if (opinionValid && receivedValid) {
      if (opinion < received) errors.opinionDeadline = MSG.deadlineBeforeReceived;
      else if (opinion > latest) errors.opinionDeadline = MSG.deadlineTooLate;
    }
  }

  if (payment !== '') {
    if (!isValidYmd(payment)) errors.paymentDeadline = MSG.invalidDate;
    else if (receivedValid && payment < received) {
      errors.paymentDeadline = isFine ? MSG.deadlineBeforeReceived : MSG.firstBeforeReceived;
    } else if (isFine && opinionValid && payment < opinion) errors.paymentDeadline = MSG.paymentBeforeOpinion;
    else if (receivedValid && payment > latest) errors.paymentDeadline = MSG.deadlineTooLate;
  }

  return { errors, firstErrorField: FIELD_ORDER.find((key) => errors[key] !== undefined) };
}

/** 폼 값 → 저장 입력. 범칙금이면 숨긴 감경 금액·의견제출 기한은 값이 남아 있어도 null이다. */
export function toNoticeInput(values: NoticeFormValues): NoticeInput {
  const isFine = values.kind === 'fine';
  return {
    name: values.name.trim(),
    kind: values.kind,
    amount: values.amount,
    discountedAmount: isFine ? values.discountedAmount : null,
    receivedDate: values.receivedDate,
    opinionDeadline: isFine && values.opinionDeadline !== '' ? values.opinionDeadline : null,
    paymentDeadline: values.paymentDeadline !== '' ? values.paymentDeadline : null,
  };
}

const RECORD_RESET_KEYS = [
  'kind',
  'amount',
  'discountedAmount',
  'receivedDate',
  'opinionDeadline',
  'paymentDeadline',
] as const satisfies readonly (keyof NoticeInput)[];

/** 금액이나 기한이 바뀌어 납부 기록을 초기화해야 하는가 — 이름만 바뀌면 false. */
export function hasRecordResetChange(original: NoticeInput, next: NoticeInput): boolean {
  return RECORD_RESET_KEYS.some((key) => original[key] !== next[key]);
}
