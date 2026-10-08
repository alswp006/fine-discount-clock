import { useEffect, useRef } from "react";
import { Spacing, Top } from "@toss/tds-mobile";
import { useNavigate, useParams } from "react-router-dom";
import { AdSlot } from "@/components/AdSlot";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import StatusState from "@/components/StatusState";
import { DeleteNoticeButton } from "@/components/result/DeleteNoticeButton";
import { FreeTier } from "@/components/result/FreeTier";
import { LegalNotice } from "@/components/result/LegalNotice";
import { RecordSheet } from "@/components/result/RecordSheet";
import { ScenarioGate } from "@/components/result/ScenarioGate";
import { ShareButton } from "@/components/result/ShareButton";
import { logImpression } from "@/lib/analytics";
import { useNotices } from "@/lib/useNotices";

const APP_NAME = "과태료 감경시계";

/** 고지서 결과 (/notice/:id) — 무료 층은 항상, 심화 층만 리워드 광고 게이트 뒤 */
export default function NoticeResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { result, today, reload, findById } = useNotices();
  const impressed = useRef(false);

  const notice = findById(id);
  const blocked =
    result.unavailable || result.newerVersion || result.corrupted || !notice;

  // 진입당 1회 — 리렌더·StrictMode 재실행·기록 후 reload에도 늘지 않는다
  useEffect(() => {
    if (blocked || impressed.current) return;
    impressed.current = true;
    logImpression("result_free_tier");
  }, [blocked]);

  if (blocked || !notice) {
    const variant = result.unavailable
      ? "unavailable"
      : result.newerVersion
        ? "newer"
        : "notFound";
    return (
      <ScreenScaffold
        top={
          <Top title={<Top.TitleParagraph>{APP_NAME}</Top.TitleParagraph>} />
        }
      >
        <StatusState
          variant={variant}
          actionLabel="홈으로"
          onAction={() => navigate("/", { replace: true })}
        />
      </ScreenScaffold>
    );
  }

  // AdSlot은 PageShell(min-height·배경) 바깥, 화면 맨 끝에 둔다 — 고정 높이·배경 래퍼 금지
  return (
    <>
      <ScreenScaffold
        top={
          <Top title={<Top.TitleParagraph>{notice.name}</Top.TitleParagraph>} />
        }
      >
        <FreeTier notice={notice} today={today} />
        <Spacing size={16} />
        <RecordSheet notice={notice} onRecorded={reload} />
        <Spacing size={24} />
        <ScenarioGate notice={notice} />
        <Spacing size={24} />
        <LegalNotice />
        <Spacing size={16} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <ShareButton />
          </div>
          <div style={{ flex: 1 }}>
            <DeleteNoticeButton notice={notice} />
          </div>
        </div>
      </ScreenScaffold>
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />
    </>
  );
}
