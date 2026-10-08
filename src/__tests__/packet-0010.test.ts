import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import {
  validateNoticeForm,
  toNoticeInput,
  hasRecordResetChange,
} from "@/lib/noticeFormValidation";
import { useNoticeFormState } from "@/components/form/useNoticeFormState";
import * as FieldsModule from "@/components/form/NoticeFormFields";

mockAll();

const h = React.createElement;
const NoticeFormFields: any = (FieldsModule as any).default ?? (FieldsModule as any).NoticeFormFields;

const TODAY = "2026-10-09";

const base = {
  name: "강남 주정차",
  kind: "fine",
  amount: 40000,
  discountedAmount: null,
  receivedDate: "2026-10-05",
  opinionDeadline: "2026-10-20",
  paymentDeadline: "2026-11-30",
} as any;

// 반환이 { errors, firstErrorField }든 errors 맵 자체든 받는다 — 문구·순서 계약만 고정한다.
const run = (patch: Record<string, unknown>) => {
  const r: any = validateNoticeForm({ ...base, ...patch }, TODAY, "create");
  return { errors: (r.errors ?? r) as Record<string, string | undefined>, first: r.firstErrorField as string | undefined };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
});

describe("고지서 입력 폼 — 검증 순수 함수·폼 상태·금액 필드·필드 묶음", () => {
  it("AC-1[P0]: 이름·금액·받은 날이 비면 3개 필드에 문구가 동시에 나오고 firstErrorField는 name이다", () => {
    const { errors, first } = run({ name: "", amount: 0, receivedDate: "" });
    expect(errors.name).toBe("고지서 이름을 입력해주세요");
    expect(errors.amount).toBe("금액을 1,000원 이상 입력해주세요");
    expect(errors.receivedDate).toBeTruthy();
    expect(first).toBe("name");
  });

  it("AC-1[P0]: 공백만 있는 이름도 같은 이름 문구이고, 정상 입력은 오류가 없다", () => {
    expect(run({ name: "   " }).errors.name).toBe("고지서 이름을 입력해주세요");
    const ok = run({});
    expect(Object.values(ok.errors).filter(Boolean)).toHaveLength(0);
    expect(ok.first).toBeUndefined();
  });

  it("AC-2[P0]: 과태료 두 기한이 비면 안내 문구, 받은 날보다 앞선 기한은 이후 문구", () => {
    const none = run({ opinionDeadline: "", paymentDeadline: "" });
    expect(Object.values(none.errors)).toContain("의견제출 기한이나 납부기한 중 하나를 입력해주세요");
    const early = run({ opinionDeadline: "2026-10-01", paymentDeadline: "2026-10-02" });
    expect(Object.values(early.errors)).toContain("기한은 받은 날 이후여야 해요");
    // 의견제출 기한만 비운 입력은 통과
    expect(Object.values(run({ opinionDeadline: "" }).errors).filter(Boolean)).toHaveLength(0);
  });

  it("AC-2[P0]: 받은 날 5년 경계(2021-10-08 실패 / 2021-10-09 통과)와 이름 20자 경계", () => {
    const old = run({ receivedDate: "2021-10-08", opinionDeadline: "2021-10-20", paymentDeadline: "2021-11-30" });
    expect(old.errors.receivedDate).toBe("받은 날은 최근 5년 안의 날짜로 입력해주세요");
    const edge = run({ receivedDate: "2021-10-09", opinionDeadline: "2021-10-20", paymentDeadline: "2021-11-30" });
    expect(edge.errors.receivedDate).toBeFalsy();
    expect(run({ name: "🚗".repeat(20) }).errors.name).toBeFalsy();
    expect(run({ name: "🚗".repeat(21) }).errors.name).toBe("이름은 20자 이내로 입력해주세요");
  });

  it("AC-3[P0]: toNoticeInput은 범칙금이면 숨긴 감경 금액·의견제출 기한을 null로 만든다", () => {
    const penalty: any = toNoticeInput({ ...base, kind: "penalty", amount: 60000, discountedAmount: 30000, opinionDeadline: "2026-10-20" });
    expect(penalty.discountedAmount).toBeNull();
    expect(penalty.opinionDeadline).toBeNull();
    expect(penalty.amount).toBe(60000);
    const fine: any = toNoticeInput({ ...base, discountedAmount: 30000 });
    expect(fine.discountedAmount).toBe(30000);
  });

  it("AC-5[P0]: hasRecordResetChange — 이름만 바꾸면 false, amount를 바꾸면 true", () => {
    const original: any = toNoticeInput(base);
    expect(hasRecordResetChange(original, { ...original, name: "다른 이름" })).toBe(false);
    expect(hasRecordResetChange(original, { ...original, amount: 50000 })).toBe(true);
  });

  const Harness = () => {
    const fs: any = useNoticeFormState();
    return h(
      "div",
      null,
      h(NoticeFormFields, { formState: fs, ...fs }),
      h(
        "button",
        {
          type: "button",
          onClick: () => {
            const r: any = validateNoticeForm(fs.values, TODAY, "create");
            fs.setErrors(r.errors ?? r);
          },
        },
        "검증하기",
      ),
    );
  };
  const renderForm = () => render(h(MemoryRouter, null, h(Harness)));
  const amountInput = (c: HTMLElement) => c.querySelectorAll('input[inputmode="numeric"]')[0] as HTMLInputElement;

  it("AC-3[P0]: 범칙금 ChipItem을 탭하면 의견제출 기한·감경 금액이 사라지고 납부기한 라벨이 1차로 바뀐다", () => {
    const { container } = renderForm();
    expect(screen.getByLabelText(/의견제출 기한/)).toBeInTheDocument();
    expect(container.querySelectorAll('input[inputmode="numeric"]')).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "범칙금" }));
    expect(screen.queryByLabelText(/의견제출 기한/)).toBeNull();
    expect(container.querySelectorAll('input[inputmode="numeric"]')).toHaveLength(1);
    expect(screen.getByLabelText(/1차 납부기한/)).toBeInTheDocument();
  });

  it("AC-4[P0]: 소수점 입력은 거부되고 문구가 보이며, 40000은 40,000으로 보이고 이름에는 maxlength가 없다", () => {
    const { container } = renderForm();
    const amount = amountInput(container);
    expect(amount.getAttribute("inputmode")).toBe("numeric");
    fireEvent.change(amount, { target: { value: "40000.5" } });
    expect(amountInput(container).value).toBe("");
    expect(screen.getByText("소수점 없이 원 단위로 입력해주세요")).toBeInTheDocument();
    fireEvent.change(amountInput(container), { target: { value: "40000" } });
    expect(amountInput(container).value).toBe("40,000");
    expect(screen.queryByText("소수점 없이 원 단위로 입력해주세요")).toBeNull();
    expect(screen.getByLabelText(/이름/).hasAttribute("maxlength")).toBe(false);
  });

  it("AC-5[P0]: 금액을 바꾸면 금액 문구만 사라지고 이름 문구는 남는다", () => {
    const { container } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "검증하기" }));
    expect(screen.getByText("고지서 이름을 입력해주세요")).toBeInTheDocument();
    expect(screen.getByText("금액을 1,000원 이상 입력해주세요")).toBeInTheDocument();
    fireEvent.change(amountInput(container), { target: { value: "40000" } });
    expect(screen.queryByText("금액을 1,000원 이상 입력해주세요")).toBeNull();
    expect(screen.getByText("고지서 이름을 입력해주세요")).toBeInTheDocument();
  });
});
