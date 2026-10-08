import { forwardRef, useRef } from 'react';
import type { ChangeEvent, FocusEvent, ReactNode } from 'react';
import { TextField } from '@toss/tds-mobile';
import { parseAmountInput } from '@/lib/inputRules';
import { formatNumber } from '@/lib/utils';

const REJECT_MESSAGE = {
  decimal: '소수점 없이 원 단위로 입력해주세요',
  negative: '0보다 큰 금액을 입력해주세요',
  noDigit: '금액을 숫자로 입력해주세요',
} as const;

// Number()가 정밀도를 잃지 않는 자릿수까지만 받는다. 상한(1,000만 원) 검사는 폼 검증이 맡는다.
const MAX_DIGITS = 15;

interface AmountFieldProps {
  label: string;
  placeholder: string;
  /** null이면 빈 칸. 0은 "0"으로 보인다. */
  value: number | null;
  /** 폼 검증 문구 또는 입력 거부 문구 — 있으면 에러 상태로 그린다. */
  error?: string;
  help?: ReactNode;
  enterKeyHint?: 'next' | 'done';
  /** 숫자만 남긴 값. 지우면 null. */
  onValueChange: (value: number | null) => void;
  /** 소수점·음수·숫자 없음 입력을 거부했을 때 — 값은 그대로 두고 문구만 알린다. */
  onReject: (message: string) => void;
}

/** 천 단위 콤마 금액 입력. 소수점과 음수는 값을 바꾸지 않고 문구만 띄운다. */
const AmountField = forwardRef<HTMLInputElement, AmountFieldProps>(function AmountField(
  { label, placeholder, value, error, help, enterKeyHint, onValueChange, onReject },
  ref,
) {
  const scrolled = useRef(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseAmountInput(raw);
    if (parsed.kind === 'reject') {
      onReject(REJECT_MESSAGE[parsed.reason]);
      return;
    }
    if (parsed.digits === '') {
      if (raw.trim() !== '') {
        onReject(REJECT_MESSAGE.noDigit);
        return;
      }
      onValueChange(null);
      return;
    }
    onValueChange(Number(parsed.digits.slice(0, MAX_DIGITS)));
  };

  // 키보드가 올라와도 가려지지 않게 처음 포커스될 때 한 번만 화면 안으로 옮긴다.
  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    if (scrolled.current) return;
    scrolled.current = true;
    try {
      e.currentTarget.scrollIntoView?.({ block: 'center' });
    } catch {
      /* 스크롤 실패는 입력에 영향이 없다 */
    }
  };

  return (
    <TextField
      ref={ref}
      variant="line"
      label={label}
      labelOption="sustain"
      placeholder={placeholder}
      inputMode="numeric"
      enterKeyHint={enterKeyHint}
      suffix="원"
      value={value === null ? '' : formatNumber(value)}
      hasError={error !== undefined}
      help={error ?? help}
      onChange={handleChange}
      onFocus={handleFocus}
    />
  );
});

export default AmountField;
export { AmountField };
