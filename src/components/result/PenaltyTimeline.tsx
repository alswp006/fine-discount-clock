import { ListRow, Paragraph, Spacing } from '@toss/tds-mobile';
import { Card } from '@/components/Card';
import { addDays } from '@/lib/dateUtils';
import { calcPenaltyStages } from '@/lib/fineEngine';
import { PENALTY_RULES } from '@/lib/fineRules';
import { formatWon } from '@/lib/format';
import type { Notice } from '@/lib/types';

const GREY600 = 'var(--adaptiveGrey600)';

const dotted = (ymd: string) => ymd.replace(/-/g, '.');

/** 범칙금 심화 층: 1차 → 2차 → 즉결심판 날짜 타임라인 */
export function PenaltyTimeline({ notice }: { notice: Notice }) {
  const s = calcPenaltyStages(notice);
  const secondStart = addDays(s.firstDeadline, 1);
  const courtStart = addDays(s.secondDeadline, 1);

  return (
    <>
      <Paragraph.Text typography="t4">기한이 지나면 이렇게 바뀌어요</Paragraph.Text>
      <Spacing size={12} />
      <Card testId="penalty-timeline-card" style={{ padding: '4px 0', gap: 0 }}>
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top={`~${dotted(s.firstDeadline)}`} bottom="1차 납부기한" />}
          right={<Paragraph.Text typography="t5">{formatWon(s.firstAmount)}</Paragraph.Text>}
        />
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={`${dotted(secondStart)}~${dotted(s.secondDeadline)}`}
              bottom={`2차 납부기한 · ${PENALTY_RULES.SECOND_SURCHARGE_PERCENT}% 가산`}
            />
          }
          right={<Paragraph.Text typography="t5">{formatWon(s.secondAmount)}</Paragraph.Text>}
        />
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={`${dotted(courtStart)}부터 즉결심판 청구`}
              bottom="금액은 법원이 정해요"
            />
          }
        />
      </Card>
      <Spacing size={8} />
      <div>
        <Paragraph.Text typography="t7" color={GREY600}>
          도로교통법 제164조·제165조
        </Paragraph.Text>
      </div>
    </>
  );
}

export default PenaltyTimeline;
