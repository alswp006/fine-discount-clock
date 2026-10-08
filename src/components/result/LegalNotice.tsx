import { Paragraph, Spacing } from '@toss/tds-mobile';

/** 결과 화면 하단의 고정 법적 고지와 납부처 안내 — 링크 없이 텍스트만 */
export function LegalNotice() {
  return (
    <div data-testid="legal-notice">
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
        법령의 일반 기준으로 계산한 참고값이에요. 고지서에 적힌 금액과 기한이 우선이에요.
      </Paragraph.Text>
      <Spacing size={4} />
      <div>
        <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
          고지서의 가상계좌, 이파인, 위택스에서 낼 수 있어요
        </Paragraph.Text>
      </div>
    </div>
  );
}

export default LegalNotice;
