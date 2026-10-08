import { useCallback } from "react";
import { Top } from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import StatusState from "@/components/StatusState";
import { logClick } from "@/lib/analytics";

const APP_NAME = "과태료 감경시계";

/**
 * 없는 경로 (*) — 어떤 Route에도 맞지 않을 때 (SPEC S5)
 * 막다른 길이 되지 않도록 '홈으로' 하나만 두고, 잘못된 경로가
 * 히스토리에 남지 않게 replace로 이동한다.
 */
export default function NotFound() {
  const navigate = useNavigate();

  const goHome = useCallback(() => {
    logClick("not_found_home");
    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{APP_NAME}</Top.TitleParagraph>} />}
    >
      <StatusState
        variant="route404"
        actionLabel="홈으로"
        onAction={goHome}
      />
    </ScreenScaffold>
  );
}
