import { useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Chip, ChipItem, Paragraph, Spacing, TextField } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { NoticeKind } from '@/lib/types';
import { PENALTY_RULES } from '@/lib/fineRules';
import type { NoticeFieldKey } from '@/lib/noticeFormValidation';
import type { NoticeFormState } from '@/components/form/useNoticeFormState';
import AmountField from '@/components/form/AmountField';

export interface FocusRequest {
  field: NoticeFieldKey;
  /** 같은 필드를 다시 요청해도 효과가 다시 돌도록 바꾸는 값. */
  seq: number;
  /** true면 focus() 없이 화면 안으로만 옮긴다 — 날짜 선택기가 저절로 열리지 않게. */
  scrollOnly?: boolean;
}

interface NoticeFormFieldsProps {
  formState: NoticeFormState;
  focusRequest?: FocusRequest | null;
}

const KIND_OPTIONS: { kind: NoticeKind; label: string }[] = [
  { kind: 'fine', label: '과태료' },
  { kind: 'penalty', label: '범칙금' },
];

function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖에서는 SDK가 throw한다 */
  }
}

/** 고지서 이름·유형·금액·날짜 입력 묶음. 등록과 수정이 같이 쓴다. */
export function NoticeFormFields({ formState, focusRequest }: NoticeFormFieldsProps) {
  const { values, errors, setValue, setErrors } = formState;
  const isFine = values.kind === 'fine';
  const inputs = useRef<Partial<Record<NoticeFieldKey, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (!focusRequest) return;
    const el = inputs.current[focusRequest.field];
    if (!el) return;
    try {
      if (!focusRequest.scrollOnly) el.focus();
      el.scrollIntoView?.({ block: 'center' });
    } catch {
      /* 포커스 이동 실패는 입력에 영향이 없다 */
    }
  }, [focusRequest]);

  const bind = (field: NoticeFieldKey) => (el: HTMLInputElement | null) => {
    inputs.current[field] = el;
  };
  const reject = (field: 'amount' | 'discountedAmount') => (message: string) =>
    setErrors((prev) => ({ ...prev, [field]: message }));
  const onText = (field: 'name' | 'receivedDate' | 'opinionDeadline' | 'paymentDeadline') =>
    (e: ChangeEvent<HTMLInputElement>) => setValue(field, e.target.value);

  const pickKind = (kind: NoticeKind) => {
    if (kind === values.kind) return;
    fireTickWeak();
    setValue('kind', kind);
  };

  const paymentHelp = isFine
    ? undefined
    : `비워 두면 받은 날로부터 ${PENALTY_RULES.FIRST_PERIOD_DAYS}일 뒤로 계산해요 (도로교통법 제164조)`;

  return (
    <div>
      <Spacing size={16} />
      <TextField
        ref={bind('name')}
        variant="line"
        label="고지서 이름"
        labelOption="sustain"
        placeholder="예: 강남 주정차"
        enterKeyHint="next"
        autoComplete="off"
        value={values.name}
        hasError={errors.name !== undefined}
        help={errors.name}
        onChange={onText('name')}
      />
      <Spacing size={8} />
      <Chip kind="select" wrap>
        {KIND_OPTIONS.map((option) => (
          <ChipItem key={option.kind} selected={values.kind === option.kind} onClick={() => pickKind(option.kind)}>
            {option.label}
          </ChipItem>
        ))}
      </Chip>
      <Spacing size={8} />
      <AmountField
        ref={bind('amount')}
        label="원래 금액"
        placeholder="예: 40,000"
        enterKeyHint={isFine ? 'next' : 'done'}
        value={values.amount === 0 ? null : values.amount}
        error={errors.amount}
        onValueChange={(n) => setValue('amount', n ?? 0)}
        onReject={reject('amount')}
      />
      {isFine && (
        <>
          <Spacing size={8} />
          <AmountField
            ref={bind('discountedAmount')}
            label="고지서에 적힌 감경 금액 (선택)"
            placeholder="예: 32,000"
            enterKeyHint="next"
            value={values.discountedAmount}
            error={errors.discountedAmount}
            help="고지서에 감경 금액이 적혀 있으면 입력해요"
            onValueChange={(n) => setValue('discountedAmount', n)}
            onReject={reject('discountedAmount')}
          />
        </>
      )}
      <Spacing size={8} />
      <TextField
        ref={bind('receivedDate')}
        variant="line"
        type="date"
        label="받은 날"
        labelOption="sustain"
        placeholder="예: 2026-10-05"
        value={values.receivedDate}
        hasError={errors.receivedDate !== undefined}
        help={errors.receivedDate}
        onChange={onText('receivedDate')}
      />
      {isFine && (
        <>
          <Spacing size={8} />
          <TextField
            ref={bind('opinionDeadline')}
            variant="line"
            type="date"
            label="의견제출 기한"
            labelOption="sustain"
            placeholder="예: 2026-10-20"
            value={values.opinionDeadline}
            hasError={errors.opinionDeadline !== undefined}
            help={errors.opinionDeadline}
            onChange={onText('opinionDeadline')}
          />
        </>
      )}
      <Spacing size={8} />
      <TextField
        ref={bind('paymentDeadline')}
        variant="line"
        type="date"
        label={isFine ? '납부기한' : '1차 납부기한'}
        labelOption="sustain"
        placeholder="예: 2026-11-30"
        value={values.paymentDeadline}
        hasError={errors.paymentDeadline !== undefined}
        help={errors.paymentDeadline ?? paymentHelp}
        onChange={onText('paymentDeadline')}
      />
      {/* 고정 하단 CTA에 마지막 필드가 가리지 않도록 */}
      <Spacing size={112} />
    </div>
  );
}

export default NoticeFormFields;
