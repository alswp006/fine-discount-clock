import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { mockAll, mockNavigate, mockOpenToast, mockLogClick } from "@/__tests__/__helpers__/mocks";
import * as SavingsHeroModule from "@/components/home/SavingsHero";
import * as NoticeCardModule from "@/components/home/NoticeCard";
import * as OpenNoticesSectionModule from "@/components/home/OpenNoticesSection";
import { useAddNotice } from "@/components/home/useAddNotice";
import { buildOpenCards, buildSavingsHero } from "@/lib/noticeSelectors";
import type { Notice } from "@/lib/types";

mockAll();

const h = React.createElement;
// default/named export 어느 쪽이든 받는다 — props 계약만 고정한다.
const SavingsHero: any = (SavingsHeroModule as any).default ?? (SavingsHeroModule as any).SavingsHero;
const NoticeCard: any = (NoticeCardModule as any).default ?? (NoticeCardModule as any).NoticeCard;
const OpenNoticesSection: any =
  (OpenNoticesSectionModule as any).default ?? (OpenNoticesSectionModule as any).OpenNoticesSection;

const TODAY = "2026-10-09";
const mk = (id: string, extra: Partial<Notice>): Notice => ({
  id,
  name: id,
  kind: "fine",
  amount: 40000,
  discountedAmount: null,
  receivedDate: "2026-10-05",
  opinionDeadline: "2026-10-20",
  paymentDeadline: "2026-11-30",
  status: "open",
  paidAmount: null,
  savedAmount: 0,
  decidedAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...extra,
});

const A = mk("A", { name: "강남 주정차", opinionDeadline: "2026-10-20", createdAt: "2026-10-01T00:00:00.000Z" });
const B = mk("B", {
  name: "출근길 속도위반",
  kind: "penalty",
  amount: 60000,
  opinionDeadline: null,
  paymentDeadline: null,
  createdAt: "2026-10-02T00:00:00.000Z",
});
const C = mk("C", { name: "마트 앞 주정차", opinionDeadline: "2026-10-11", createdAt: "2026-10-03T00:00:00.000Z" });

const wrap = (ui: React.ReactElement) => render(h(MemoryRouter, null, ui));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T09:00:00+09:00"));
});

describe("홈 컴포넌트 — 아끼는 돈 히어로·고지서 카드·미결정 목록·등록 동작", () => {
  it("AC-1[P0]: OpenNoticesSection은 notice-card 3개를 C → B → A 순서로 그리고 금액 문구를 보여 준다", () => {
    const cards = buildOpenCards([A, B, C], TODAY);
    wrap(h(OpenNoticesSection, { cards }));
    const rendered = screen.getAllByTestId("notice-card");
    expect(rendered).toHaveLength(3);
    expect(within(rendered[0]).getByText("마트 앞 주정차")).toBeInTheDocument();
    expect(within(rendered[1]).getByText("출근길 속도위반")).toBeInTheDocument();
    expect(within(rendered[2]).getByText("강남 주정차")).toBeInTheDocument();
    expect(within(rendered[0]).getByText(/32,000원/)).toBeInTheDocument();
    expect(within(rendered[1]).getByText(/60,000원/)).toBeInTheDocument();
    expect(within(rendered[2]).getByText(/32,000원/)).toBeInTheDocument();
    expect(screen.getByText("남은 고지서")).toBeInTheDocument();
  });

  it("AC-2[P0]: SavingsHero는 라벨·28,000원·보조문을 보여 준다", () => {
    const hero = buildSavingsHero([A, B, C], TODAY);
    wrap(h(SavingsHero, { hero }));
    const root = screen.getByTestId("savings-hero");
    expect(within(root).getByText("기한 안에 내면 아끼는 돈")).toBeInTheDocument();
    // CountUp은 0→값 애니메이션이라 최종값은 비동기로 도착한다
    expect(root.textContent).toMatch(/28,000|28000/);
    expect(within(root).getByText("고지서 3장 · 가장 급한 건 마트 앞 주정차 D-2")).toBeInTheDocument();
  });

  it("AC-3[P1]: D-2 카드에는 '마감 임박', D+1 카드에는 '기한 지남' 배지가 보인다", () => {
    const cards = buildOpenCards([C, B], TODAY);
    wrap(h(OpenNoticesSection, { cards }));
    const urgent = screen.getAllByTestId("notice-card").find((el) => within(el).queryByText("마트 앞 주정차"))!;
    expect(within(urgent).getByText("마감 임박")).toBeInTheDocument();
    expect(within(urgent).queryByText("기한 지남")).toBeNull();
    const b = screen.getAllByTestId("notice-card").find((el) => within(el).queryByText("출근길 속도위반"))!;
    expect(within(b).queryByText("마감 임박")).toBeNull();
    expect(within(b).queryByText("기한 지남")).toBeNull();
  });

  it("AC-3[P1]: 모든 기한이 지난 과태료 카드에는 '납부기한 지남 · D+1'과 '41,200원부터'가 보인다", () => {
    const passed = mk("passed", { name: "지난 과태료", opinionDeadline: "2026-10-20", paymentDeadline: "2026-11-30" });
    const cards = buildOpenCards([passed], "2026-12-01");
    wrap(h(NoticeCard, { card: cards[0] }));
    const card = screen.getByTestId("notice-card");
    expect(within(card).getByText(/납부기한 지남 · D\+1/)).toBeInTheDocument();
    expect(within(card).getByText(/41,200원부터/)).toBeInTheDocument();
    expect(within(card).getByText("기한 지남")).toBeInTheDocument();
  });

  it("AC-4[P0]: 카드를 탭하면 tickWeak 햅틱·home_open_notice 로그·/notice/<id> 이동이 각 1회 일어난다", () => {
    const cards = buildOpenCards([C], TODAY);
    wrap(h(NoticeCard, { card: cards[0] }));
    fireEvent.click(screen.getByText("마트 앞 주정차"));
    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(mockLogClick).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith("home_open_notice");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/notice/C");
  });

  it("AC-5[P0]: useAddNotice는 50건이면 이동 없이 Toast 문구를 띄운다", () => {
    let add: () => void = () => {};
    function Harness() {
      add = useAddNotice(50);
      return null;
    }
    wrap(h(Harness));
    add();
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast).toHaveBeenCalledWith("고지서는 50장까지 등록할 수 있어요");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockLogClick).not.toHaveBeenCalled();
  });

  it("AC-5[P0]: useAddNotice는 49건이면 home_add_notice 로그 후 /notice/new로 이동하고 Toast는 없다", () => {
    let add: () => void = () => {};
    function Harness() {
      add = useAddNotice(49);
      return null;
    }
    wrap(h(Harness));
    add();
    expect(mockLogClick).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith("home_add_notice");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/notice/new");
    expect(mockOpenToast).not.toHaveBeenCalled();
  });
});
