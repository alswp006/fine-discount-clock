import { useEffect, useLayoutEffect, useRef } from 'react';
import { TossRewardAd } from '@/components/TossRewardAd';
import { FineScenarioTable } from '@/components/result/FineScenarioTable';
import { PenaltyTimeline } from '@/components/result/PenaltyTimeline';
import { logImpression } from '@/lib/analytics';
import type { Notice } from '@/lib/types';

interface ScenarioGateProps {
  notice: Notice;
  /** locked-tier가 처음 렌더된 직후 한 번 — 게이트 바깥 locked-hint를 숨길 때 쓴다 */
  onTierMount?: () => void;
}

function LockedTier({ notice, onTierMount }: ScenarioGateProps) {
  const impressed = useRef(false);
  const mountedRef = useRef(false);

  // 잠금 안내(locked-hint)는 locked-tier가 그려지기 전에 숨겨야 깜빡이지 않는다
  useLayoutEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    onTierMount?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 게이트가 열려 이 층이 처음 렌더될 때 1회 — 리렌더·StrictMode 재실행에도 늘지 않는다
  useEffect(() => {
    if (impressed.current) return;
    impressed.current = true;
    logImpression('scenario_locked_tier');
  }, []);

  return (
    <div data-testid="locked-tier">
      {notice.kind === 'penalty' ? <PenaltyTimeline notice={notice} /> : <FineScenarioTable notice={notice} />}
    </div>
  );
}

/**
 * 결과 화면 심화 층 — 과태료는 월별 가산금 표, 범칙금은 납부 단계 타임라인.
 * 리워드 광고 게이트(TossRewardAd)의 자식으로만 렌더된다. 무료 층은 이 게이트 바깥에 둔다.
 */
export function ScenarioGate({ notice, onTierMount }: ScenarioGateProps) {
  return (
    <TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>
      <LockedTier notice={notice} onTierMount={onTierMount} />
    </TossRewardAd>
  );
}

export default ScenarioGate;
