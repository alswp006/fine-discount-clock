import { Button, ListRow, Paragraph, Spacing } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { MiniBar } from '@/components/MiniBar';
import { Sparkline } from '@/components/Sparkline';
import { addDays } from '@/lib/dateUtils';
import { calcFineScenario } from '@/lib/fineEngine';
import { FINE_RULES } from '@/lib/fineRules';
import { formatWon } from '@/lib/format';
import type { Notice, RouteState } from '@/lib/types';

const GREY600 = 'var(--adaptiveGrey600)';

/** 표에 보여 줄 개월 수 — SPEC F4-AC-2 순서 */
const SHOWN_MONTHS = [0, 1, 3, 6, 12, 24, 36, FINE_RULES.HEAVY_SURCHARGE_MAX_MONTHS] as const;

const PERMILLE_PER_PERCENT = 10;

const dotted = (ymd: string) => ymd.replace(/-/g, '.');

/** 중가산금 상한까지 쌓였을 때 원래 금액 대비 가산 비율(%) — 3% + 60개월 × 1.2% */
const MAX_SURCHARGE_PERCENT =
  FINE_RULES.SURCHARGE_PERCENT +
  (FINE_RULES.HEAVY_SURCHARGE_MAX_MONTHS * FINE_RULES.HEAVY_SURCHARGE_PERMILLE) / PERMILLE_PER_PERCENT;

function rowLabel(month: number, paymentDeadline: string | null): string {
  if (month === 0) {
    return paymentDeadline ? `${dotted(addDays(paymentDeadline, 1))}부터` : '납부기한 다음 날';
  }
  return `${month}개월`;
}

/** 과태료 심화 층: 월별 가산금 표 + 추이 + 원금 대비 비중 */
export function FineScenarioTable({ notice }: { notice: Notice }) {
  const navigate = useNavigate();
  const rows = calcFineScenario(notice.amount, FINE_RULES.HEAVY_SURCHARGE_MAX_MONTHS);
  const shown = SHOWN_MONTHS.map((m) => rows[m]);
  const last = rows[rows.length - 1];
  const monthly = rows[1].total - rows[0].total;

  const goInputDeadline = () => {
    const state: RouteState = { focus: 'paymentDeadline' };
    navigate(`/notice/${notice.id}/edit`, { state });
  };

  return (
    <>
      <Paragraph.Text typography="t4">기한을 넘기면 이만큼 늘어요</Paragraph.Text>
      <Spacing size={4} />
      <div>
        <Paragraph.Text typography="t6" color={GREY600}>
          {`한 달 늦을 때마다 ${formatWon(monthly)}씩 더 붙어요`}
        </Paragraph.Text>
      </div>
      <Spacing size={12} />

      <Card testId="scenario-table-card" style={{ padding: '4px 0', gap: 0 }}>
        {shown.map((row) => (
          <ListRow
            key={row.month}
            data-testid="scenario-row"
            contents={<ListRow.Texts type="1RowTypeA" top={rowLabel(row.month, notice.paymentDeadline)} />}
            right={<Paragraph.Text typography="t5">{formatWon(row.total)}</Paragraph.Text>}
          />
        ))}
      </Card>
      <Spacing size={8} />
      <div>
        <Paragraph.Text typography="t7" color={GREY600}>
          {`중가산금은 ${FINE_RULES.HEAVY_SURCHARGE_MAX_MONTHS}개월까지만 붙어요 — 최대 원래 금액의 ${MAX_SURCHARGE_PERCENT}% (질서위반행위규제법 제24조)`}
        </Paragraph.Text>
      </div>

      {notice.paymentDeadline === null ? (
        <>
          <Spacing size={12} />
          <div>
            <Paragraph.Text typography="t7" color={GREY600}>
              본 고지서의 납부기한을 입력하면 체납 시작일도 보여드려요
            </Paragraph.Text>
          </div>
          <Spacing size={8} />
          <Button variant="weak" display="block" onClick={goInputDeadline}>
            납부기한 입력
          </Button>
        </>
      ) : null}

      <Spacing size={16} />
      <Card testId="scenario-chart-card">
        <Paragraph.Text typography="t6" color={GREY600}>
          늦은 개월 수에 따른 납부액
        </Paragraph.Text>
        <Spacing size={8} />
        <Sparkline data={rows.map((r) => r.total)} testId="scenario-sparkline" />
        <Spacing size={12} />
        <MiniBar ratio={last.surcharge / last.total} testId="scenario-minibar" />
        <Spacing size={8} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Paragraph.Text typography="t7" color={GREY600}>
            {`원래 금액 ${formatWon(notice.amount)}`}
          </Paragraph.Text>
          <Paragraph.Text typography="t7" color={GREY600}>
            {`최대 가산금 ${formatWon(last.surcharge)}`}
          </Paragraph.Text>
        </div>
      </Card>
    </>
  );
}

export default FineScenarioTable;
