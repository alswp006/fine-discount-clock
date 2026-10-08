import { Paragraph } from '@toss/tds-mobile';
import { SummaryHero } from '@/components/SummaryHero';
import { CountUp } from '@/components/CountUp';
import type { SavingsHero as SavingsHeroData } from '@/lib/noticeSelectors';

/** 홈 최상단 히어로 — 기한 안에 내면 아끼는 돈 합계. open 고지서가 없으면 안내 한 줄 */
export function SavingsHero({ hero }: { hero: SavingsHeroData | null }) {
  if (hero === null) {
    return <Paragraph.Text typography="t5">남은 고지서가 없어요</Paragraph.Text>;
  }
  return (
    <SummaryHero
      testId="savings-hero"
      label="기한 안에 내면 아끼는 돈"
      value={<CountUp value={hero.total} unit="원" typography="t1" />}
      caption={`고지서 ${hero.count}장 · 가장 급한 건 ${hero.urgentName} ${hero.urgentDday}`}
    />
  );
}

export default SavingsHero;
