import { Paragraph, Spacing } from '@toss/tds-mobile';
import { Card } from '@/components/Card';
import { NoticeCard } from '@/components/home/NoticeCard';
import type { OpenCard } from '@/lib/noticeSelectors';

/** '남은 고지서' — 이미 정렬된 open 카드 목록(buildOpenCards 결과)을 그대로 그린다 */
export function OpenNoticesSection({ cards }: { cards: OpenCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section>
      <Paragraph.Text typography="t4">남은 고지서</Paragraph.Text>
      <Spacing size={12} />
      <Card>
        {cards.map((card) => (
          <NoticeCard key={card.id} card={card} />
        ))}
      </Card>
    </section>
  );
}

export default OpenNoticesSection;
