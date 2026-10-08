import { describe, expect, it } from 'vitest';
import {
  hasRecordResetChange,
  toNoticeInput,
  validateNoticeForm,
  type NoticeFormValues,
} from '@/lib/noticeFormValidation';

const TODAY = '2026-10-09';

const base: NoticeFormValues = {
  name: '강남 주정차',
  kind: 'fine',
  amount: 40000,
  discountedAmount: null,
  receivedDate: '2026-10-05',
  opinionDeadline: '2026-10-20',
  paymentDeadline: '2026-11-30',
};

const check = (patch: Partial<NoticeFormValues>, mode: 'create' | 'edit' = 'create', original?: string) =>
  validateNoticeForm({ ...base, ...patch }, TODAY, mode, { originalReceivedDate: original });

describe('validateNoticeForm', () => {
  it('이름·금액·받은 날이 비면 3개 문구가 동시에 나오고 첫 오류는 이름이다', () => {
    const r = check({ name: '', amount: 0, receivedDate: '' });
    expect(r.errors).toMatchObject({
      name: '고지서 이름을 입력해주세요',
      amount: '금액을 1,000원 이상 입력해주세요',
      receivedDate: '고지서 받은 날을 입력해주세요',
    });
    expect(r.firstErrorField).toBe('name');
  });

  it('정상 입력은 오류가 없다', () => {
    const r = check({});
    expect(r.errors).toEqual({});
    expect(r.firstErrorField).toBeUndefined();
  });

  it('금액 상한과 감경 금액 규칙', () => {
    expect(check({ amount: 10_000_001 }).errors.amount).toBe('금액은 1,000만원 이하로 입력해주세요');
    expect(check({ discountedAmount: 0 }).errors.discountedAmount).toBe('감경 금액은 1원 이상 입력해주세요');
    expect(check({ discountedAmount: 40000 }).errors.discountedAmount).toBe('감경 금액은 원래 금액보다 작아야 해요');
    expect(check({ discountedAmount: 32000 }).errors.discountedAmount).toBeUndefined();
  });

  it('받은 날: 오늘 이후·5년 경계·달력 오류', () => {
    expect(check({ receivedDate: '2026-10-10' }).errors.receivedDate).toBe('받은 날은 오늘이나 그 전 날짜로 입력해주세요');
    expect(check({ receivedDate: '2026-02-30' }).errors.receivedDate).toBe('올바른 날짜를 입력해주세요');
    const old = { opinionDeadline: '2021-10-20', paymentDeadline: '2021-11-30' };
    expect(check({ ...old, receivedDate: '2021-10-08' }).errors.receivedDate).toBe('받은 날은 최근 5년 안의 날짜로 입력해주세요');
    expect(check({ ...old, receivedDate: '2021-10-09' }).errors.receivedDate).toBeUndefined();
  });

  it('수정 모드에서 받은 날을 바꾸지 않았으면 5년 하한을 보지 않는다', () => {
    const old = { receivedDate: '2021-10-08', opinionDeadline: '2021-10-20', paymentDeadline: '2021-11-30' };
    expect(check(old, 'edit', '2021-10-08').errors.receivedDate).toBeUndefined();
    expect(check(old, 'edit', '2022-01-01').errors.receivedDate).toBeDefined();
  });

  it('기한: 둘 다 비움·받은 날 이전·의견제출 이전·1년 초과', () => {
    expect(check({ opinionDeadline: '', paymentDeadline: '' }).errors.opinionDeadline).toBe(
      '의견제출 기한이나 납부기한 중 하나를 입력해주세요',
    );
    expect(check({ opinionDeadline: '2026-10-01' }).errors.opinionDeadline).toBe('기한은 받은 날 이후여야 해요');
    expect(check({ opinionDeadline: '2026-11-30', paymentDeadline: '2026-11-01' }).errors.paymentDeadline).toBe(
      '납부기한은 의견제출 기한 이후여야 해요',
    );
    expect(check({ paymentDeadline: '2027-10-06' }).errors.paymentDeadline).toBe('기한은 받은 날로부터 1년 안으로 입력해주세요');
    expect(check({ paymentDeadline: '2027-10-05' }).errors.paymentDeadline).toBeUndefined();
  });

  it('받은 날이 유효하지 않으면 받은 날과 비교하는 기한 검사는 하지 않는다', () => {
    const r = check({ receivedDate: '', opinionDeadline: '2020-01-01', paymentDeadline: '2030-01-01' });
    expect(r.errors.opinionDeadline).toBeUndefined();
    expect(r.errors.paymentDeadline).toBeUndefined();
  });

  it('범칙금은 의견제출 기한·감경 금액을 보지 않고 1차 납부기한 문구를 쓴다', () => {
    const penalty = { kind: 'penalty' as const, opinionDeadline: '', discountedAmount: 99999999, paymentDeadline: '' };
    expect(check(penalty).errors).toEqual({});
    expect(check({ ...penalty, paymentDeadline: '2026-10-01' }).errors.paymentDeadline).toBe(
      '1차 납부기한은 받은 날 이후여야 해요',
    );
  });

  it('이름 글자 수는 코드포인트 기준이다', () => {
    expect(check({ name: '🚗'.repeat(20) }).errors.name).toBeUndefined();
    expect(check({ name: '🚗'.repeat(21) }).errors.name).toBe('이름은 20자 이내로 입력해주세요');
    expect(check({ name: '   ' }).errors.name).toBe('고지서 이름을 입력해주세요');
  });
});

describe('toNoticeInput / hasRecordResetChange', () => {
  it('범칙금이면 숨긴 감경 금액·의견제출 기한을 null로 만든다', () => {
    const input = toNoticeInput({ ...base, kind: 'penalty', discountedAmount: 30000 });
    expect(input.discountedAmount).toBeNull();
    expect(input.opinionDeadline).toBeNull();
  });

  it('이름은 trim하고 빈 기한은 null로 만든다', () => {
    const input = toNoticeInput({ ...base, name: '  강남  ', opinionDeadline: '', paymentDeadline: '' });
    expect(input.name).toBe('강남');
    expect(input.opinionDeadline).toBeNull();
    expect(input.paymentDeadline).toBeNull();
  });

  it('이름만 바꾸면 false, 금액·기한을 바꾸면 true', () => {
    const original = toNoticeInput(base);
    expect(hasRecordResetChange(original, { ...original, name: '다른 이름' })).toBe(false);
    expect(hasRecordResetChange(original, { ...original, amount: 50000 })).toBe(true);
    expect(hasRecordResetChange(original, { ...original, paymentDeadline: null })).toBe(true);
  });
});
