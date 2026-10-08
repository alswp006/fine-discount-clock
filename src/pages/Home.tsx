import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Paragraph, Spacing, Top, useToast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { EmptyState } from '@/components/StateView';
import StatusState from '@/components/StatusState';
import { AdSlot } from '@/components/AdSlot';
import { SavingsHero } from '@/components/home/SavingsHero';
import { OpenNoticesSection } from '@/components/home/OpenNoticesSection';
import { DecidedSection } from '@/components/home/DecidedSection';
import { useAddNotice } from '@/components/home/useAddNotice';
import { useNotices } from '@/lib/useNotices';
import { readRouteState } from '@/lib/routeState';
import { buildDecidedSection, buildOpenCards, buildSavingsHero } from '@/lib/noticeSelectors';

const CORRUPTED_MESSAGE = '저장된 데이터를 읽을 수 없어 새로 시작해요';
const UNBACKED_MESSAGE = '이전 데이터를 백업하지 못했어요. 새 고지서를 등록하면 이전 데이터는 지워져요';

function tickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Home() {
  const { result, notices, today, reload } = useNotices();
  const location = useLocation();
  const toast = useToast();
  const addNotice = useAddNotice(notices.length);

  // StrictMode가 effect를 두 번 돌려도 ref는 유지되므로 Toast는 1회만 뜬다
  const corruptedShown = useRef(false);
  const deletedShown = useRef(false);

  useEffect(() => {
    if (result.corrupted && !corruptedShown.current) {
      corruptedShown.current = true;
      toast.openToast(CORRUPTED_MESSAGE);
    }
  }, [result.corrupted, toast]);

  const { deletedName } = readRouteState(location.state);
  useEffect(() => {
    if (deletedName !== undefined && !deletedShown.current) {
      deletedShown.current = true;
      toast.openToast(`'${deletedName}' 고지서를 삭제했어요`);
    }
  }, [deletedName, toast]);

  const openCards = useMemo(() => buildOpenCards(notices, today), [notices, today]);
  const hero = useMemo(() => buildSavingsHero(notices, today), [notices, today]);
  const decided = useMemo(() => buildDecidedSection(notices), [notices]);

  const top = <Top title={<Top.TitleParagraph>과태료 감경시계</Top.TitleParagraph>} />;

  if (result.unavailable || result.newerVersion) {
    return (
      <ScreenScaffold top={top}>
        <StatusState
          variant={result.unavailable ? 'unavailable' : 'newer'}
          actionLabel="다시 시도"
          onAction={() => {
            tickWeak();
            reload();
          }}
        />
      </ScreenScaffold>
    );
  }

  const isEmpty = notices.length === 0;

  return (
    <ScreenScaffold top={top} bottom={<SubmitFooter label="고지서 등록" onClick={addNotice} />}>
      {isEmpty ? (
        <div
          style={{
            minHeight: 'calc(100dvh - 240px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <EmptyState
            title="받은 고지서를 등록해 보세요"
            description="감경 마감과 늦으면 붙는 금액을 계산해 드려요"
          />
          {result.backupFailed ? (
            <div style={{ textAlign: 'center' }}>
              <Paragraph.Text data-testid="unbacked-warning" typography="t7" color="var(--adaptiveGrey700)">
                {UNBACKED_MESSAGE}
              </Paragraph.Text>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <SavingsHero hero={hero} />
          <Spacing size={24} />
          <OpenNoticesSection cards={openCards} />
          {decided.rows.length > 0 ? <Spacing size={24} /> : null}
          <DecidedSection section={decided} />
          <Spacing size={24} />
          <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ''} />
          {/* 고정 하단 CTA에 마지막 카드가 가리지 않도록 */}
          <Spacing size={96} />
        </>
      )}
    </ScreenScaffold>
  );
}
