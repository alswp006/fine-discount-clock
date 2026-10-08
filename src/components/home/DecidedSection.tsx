import { ListRow, Paragraph, Spacing } from '@toss/tds-mobile';
import type { DecidedSection as DecidedSectionData } from '@/lib/noticeSelectors';
import { formatWon } from '@/lib/format';

/** '정리한 고지서' — 납부·의견제출로 마무리한 고지서와 지금까지 아낀 금액 */
export function DecidedSection({ section }: { section: DecidedSectionData }) {
  if (section.rows.length === 0) return null;
  return (
    <section>
      <Paragraph.Text typography="t4">정리한 고지서</Paragraph.Text>
      <Spacing size={4} />
      <div>
        <Paragraph.Text data-testid="saved-total" typography="t6" color="var(--adaptiveGrey600)">
          {`지금까지 아낀 금액 ${formatWon(section.savedTotal)}`}
        </Paragraph.Text>
      </div>
      <Spacing size={12} />
      {section.rows.map((row) => (
        <ListRow
          key={row.id}
          contents={<ListRow.Texts type="2RowTypeA" top={row.name} bottom={row.text} />}
        />
      ))}
    </section>
  );
}

export default DecidedSection;
