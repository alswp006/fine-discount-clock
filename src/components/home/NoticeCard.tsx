import { Badge, ListRow, Paragraph } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useNavigate } from 'react-router-dom';
import { logClick } from '@/lib/analytics';
import type { OpenCard } from '@/lib/noticeSelectors';

/** 고지서 한 장 — 이름은 사용자가 입력한 그대로, 탭하면 결과 화면으로 */
export function NoticeCard({ card }: { card: OpenCard }) {
  const navigate = useNavigate();

  const open = () => {
    try {
      Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
    } catch {
      /* WebView 밖에서는 throw — 무시 */
    }
    logClick('home_open_notice');
    navigate(`/notice/${card.id}`);
  };

  const bottom = card.deadlineText
    ? `${card.deadlineText} · 지금 내면 ${card.dueText}`
    : `지금 내면 ${card.dueText}`;

  return (
    <div data-testid="notice-card">
      <ListRow
        onClick={open}
        contents={<ListRow.Texts type="2RowTypeA" top={card.notice.name} bottom={bottom} />}
        right={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {card.ddayText ? <Paragraph.Text typography="t5">{card.ddayText}</Paragraph.Text> : null}
            {card.badge === '마감 임박' ? (
              <Badge size="small" variant="weak" color="red">마감 임박</Badge>
            ) : null}
            {card.badge === '기한 지남' ? (
              <Badge size="small" variant="fill" color="red">기한 지남</Badge>
            ) : null}
          </div>
        }
      />
    </div>
  );
}

export default NoticeCard;
