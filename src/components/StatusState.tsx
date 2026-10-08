import { Asset, Button, Paragraph, Spacing } from "@toss/tds-mobile";
import type { StatusVariant } from "@/lib/contract";
import { EmptyState } from "@/components/StateView";

const COPY: Record<StatusVariant, { title: string; description?: string }> = {
  notFound: { title: "고지서를 찾을 수 없어요" },
  unavailable: {
    title: "저장 공간에 접근할 수 없어요",
    description: "토스 앱을 다시 실행한 뒤 시도해 주세요",
  },
  newer: {
    title: "새 버전 앱에서 저장한 데이터가 있어요",
    description: "토스 앱을 다시 실행한 뒤 시도해 주세요",
  },
  route404: { title: "페이지를 찾을 수 없어요" },
  renderError: {
    title: "일시적인 문제가 생겼어요",
    description: "다시 시도해도 계속되면 토스 앱을 다시 실행해 주세요",
  },
};

/**
 * 차단 상태 공용 화면 — 아이콘 + 제목 + 보조 문구 + 보조(weak) 버튼.
 * '홈으로' 같은 이동은 호출 측이 onAction에서 navigate('/', { replace: true })로 넘긴다.
 * actionLabel·onAction 중 하나라도 없으면 버튼을 그리지 않는다.
 */
export default function StatusState({
  variant,
  actionLabel,
  onAction,
}: {
  variant: StatusVariant;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { title, description } = COPY[variant];

  return (
    <EmptyState
      testId={`status-state-${variant}`}
      icon={
        <>
          <Asset.ContentIcon
            name="icon-warning-circle-red"
            alt=""
            style={{ width: 48, height: 48 }}
          />
          <Spacing size={4} />
        </>
      }
      title={title}
      description={
        description ? (
          <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
            {description}
          </Paragraph.Text>
        ) : undefined
      }
      action={
        actionLabel && onAction ? (
          <Button variant="weak" size="large" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
