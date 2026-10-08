import type { ReactNode } from 'react';
import { Badge, Button, ListRow, Paragraph, Spacing } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { CountUp } from '@/components/CountUp';
import { SummaryHero } from '@/components/SummaryHero';
import {
  calcDday,
  calcFineComparison,
  calcPenaltyStages,
  getKeyDeadline,
  getLastDeadline,
  potentialSaving,
} from '@/lib/fineEngine';
import { formatDateDot, formatDday, formatWon } from '@/lib/format';
import type { Notice, RouteState } from '@/lib/types';

const GREY400 = 'var(--adaptiveGrey400)';
const GREY600 = 'var(--adaptiveGrey600)';

/** 스크린리더용 구분자 — 화면에는 보이지 않고 "라벨 D-11 · 날짜"로 읽힌다 */
function Sr({ children }: { children: string }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function DdayValue({ days }: { days: number }) {
  if (days === 0) return <Paragraph.Text typography="t1">{formatDday(0)}</Paragraph.Text>;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <Paragraph.Text typography="t1">{days > 0 ? 'D-' : 'D+'}</Paragraph.Text>
      <CountUp value={Math.abs(days)} unit="" typography="t1" />
    </div>
  );
}

type Hero =
  | { type: 'dday'; label: string; days: number; date: string; afterDeadline: boolean }
  | { type: 'input'; caption: string | null };

function buildHero(notice: Notice, today: string): Hero {
  const key = getKeyDeadline(notice, today);
  if (key) return { type: 'dday', label: `${key.label}까지`, days: key.dday, date: key.date, afterDeadline: false };
  const last = getLastDeadline(notice, today);
  if (last && last.label !== '감경 마감') {
    return { type: 'dday', label: `${last.label}이 지났어요`, days: last.dday, date: last.date, afterDeadline: true };
  }
  return {
    type: 'input',
    caption: last ? `감경 마감 ${formatDateDot(last.date)}이 지났어요` : null,
  };
}

interface RowProps {
  main: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  emphasized?: boolean;
  inactive?: boolean;
  /** 강조를 금액(right)에 줄지, 문장(main)에 줄지 */
  emphasis?: 'main' | 'right';
}

function Row({ main, sub, right, emphasized = false, inactive = false, emphasis = 'right' }: RowProps) {
  const color = inactive ? GREY400 : undefined;
  const mainTypo = emphasized && emphasis === 'main' ? 't4' : 't5';
  return (
    <ListRow
      contents={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color }}>
          <Paragraph.Text typography={mainTypo} color={color}>
            {main}
          </Paragraph.Text>
          {sub ? (
            <Paragraph.Text typography="t7" color={color ?? GREY600}>
              {sub}
            </Paragraph.Text>
          ) : null}
        </div>
      }
      right={right}
    />
  );
}

function Amt({ text, emphasized, inactive }: { text: string; emphasized: boolean; inactive: boolean }) {
  return (
    <Paragraph.Text typography={emphasized ? 't2' : 't5'} color={inactive ? GREY400 : undefined}>
      {text}
    </Paragraph.Text>
  );
}

function SavingBadge({ saving }: { saving: number }) {
  return (
    <Badge size="small" variant="weak" color="blue">
      {`${formatWon(saving)} 절약`}
    </Badge>
  );
}

const dotted = (ymd: string) => ymd.replace(/-/g, '.');

type Phase = 'first' | 'second' | 'after';

/** 과태료: 감경 기간 / 감경 마감 후 / 납부기한 후. 범칙금: 1차 / 2차 / 그 뒤 */
function phaseOf(notice: Notice, today: string): Phase {
  if (notice.kind === 'penalty') {
    const s = calcPenaltyStages(notice);
    if (calcDday(s.firstDeadline, today) >= 0) return 'first';
    return calcDday(s.secondDeadline, today) >= 0 ? 'second' : 'after';
  }
  if (notice.opinionDeadline && calcDday(notice.opinionDeadline, today) >= 0) return 'first';
  if (!notice.paymentDeadline || calcDday(notice.paymentDeadline, today) >= 0) return 'second';
  return 'after';
}

function FineRows({ notice, phase, saving }: { notice: Notice; phase: Phase; saving: number }) {
  const c = calcFineComparison(notice);
  return (
    <>
      <Row
        main="감경 납부액"
        sub={phase === 'first' ? undefined : '감경 기간이 끝났어요'}
        emphasized={phase === 'first'}
        inactive={phase !== 'first'}
        right={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <Amt text={formatWon(c.discounted)} emphasized={phase === 'first'} inactive={phase !== 'first'} />
            {phase === 'first' && saving > 0 ? <SavingBadge saving={saving} /> : null}
          </div>
        }
      />
      <Row
        main={phase === 'second' ? '지금 내면' : '감경 기한 후'}
        emphasized={phase === 'second'}
        inactive={phase === 'after'}
        right={<Amt text={formatWon(c.full)} emphasized={phase === 'second'} inactive={phase === 'after'} />}
      />
      <Row
        main={phase === 'after' ? '지금 내면' : '납부기한까지 안 내면'}
        sub={phase === 'after' ? '한 달이 지날 때마다 중가산금이 더 붙어요 (질서위반행위규제법 제24조)' : undefined}
        emphasized={phase === 'after'}
        right={<Amt text={`${formatWon(c.overdueFirst)}부터`} emphasized={phase === 'after'} inactive={false} />}
      />
    </>
  );
}

function PenaltyRows({ notice, phase, saving }: { notice: Notice; phase: Phase; saving: number }) {
  const s = calcPenaltyStages(notice);
  return (
    <>
      <Row
        main={`1차 기한 안에 ${formatWon(s.firstAmount)}`}
        emphasized={phase === 'first'}
        inactive={phase !== 'first'}
        emphasis="main"
        right={phase === 'first' && saving > 0 ? <SavingBadge saving={saving} /> : undefined}
      />
      <Row
        main={`2차 기한(${dotted(s.secondDeadline)})까지 ${formatWon(s.secondAmount)}`}
        emphasized={phase === 'second'}
        inactive={phase === 'after'}
        emphasis="main"
      />
      {phase === 'after' ? (
        <Row main="즉결심판이 청구될 수 있어요 — 금액은 법원이 정해요 (도로교통법 제165조)" emphasized emphasis="main" />
      ) : (
        <Row main="그 뒤엔 즉결심판이 청구돼요 (도로교통법 제165조)" />
      )}
    </>
  );
}

/** 결과 화면 무료 층 — 광고와 무관하게 항상 보인다(리워드 광고 게이트의 자식이 아니다) */
export function FreeTier({ notice, today }: { notice: Notice; today: string }) {
  const navigate = useNavigate();
  const hero = buildHero(notice, today);
  const phase = phaseOf(notice, today);
  const saving = potentialSaving(notice, today);

  const goInputDeadline = () => {
    const state: RouteState = { focus: 'paymentDeadline' };
    navigate(`/notice/${notice.id}/edit`, { state });
  };

  return (
    <div data-testid="free-tier">
      {notice.status === 'objected' ? (
        <>
          <div>
            <Paragraph.Text typography="t6" color={GREY600}>
              의견제출 결과를 기다리는 중이에요. 받아들여지지 않으면 감경 없이 부과될 수 있어요
            </Paragraph.Text>
          </div>
          <Spacing size={12} />
        </>
      ) : null}

      {hero.type === 'dday' ? (
        <SummaryHero
          testId="dday-hero"
          label={
            <>
              {hero.label}
              <Sr>{hero.afterDeadline ? ' · ' : ' '}</Sr>
            </>
          }
          value={<DdayValue days={hero.days} />}
          caption={
            <>
              <Sr> · </Sr>
              {formatDateDot(hero.date)}
            </>
          }
        />
      ) : (
        <SummaryHero
          testId="dday-hero"
          label="납부기한"
          value={<Paragraph.Text typography="t3">납부기한을 입력해 주세요</Paragraph.Text>}
          caption={hero.caption ?? undefined}
        />
      )}

      {hero.type === 'input' ? (
        <>
          <Spacing size={12} />
          <Button variant="weak" display="block" onClick={goInputDeadline}>
            납부기한 입력
          </Button>
        </>
      ) : null}

      <Spacing size={16} />
      <Card testId="compare-card" style={{ padding: '4px 0', gap: 0 }}>
        {notice.kind === 'penalty' ? (
          <PenaltyRows notice={notice} phase={phase} saving={saving} />
        ) : (
          <FineRows notice={notice} phase={phase} saving={saving} />
        )}
      </Card>

      {notice.kind === 'fine' && phase === 'first' ? (
        <>
          <Spacing size={12} />
          <div>
            <Paragraph.Text typography="t7" color={GREY600}>
              감경은 의견제출 기한 안에 스스로 납부할 때만 적용돼요 (질서위반행위규제법 제18조)
            </Paragraph.Text>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default FreeTier;
