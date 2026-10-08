import { useMemo } from 'react';
import { Top } from '@toss/tds-mobile';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import StatusState from '@/components/StatusState';
import { NoticeFormFields } from '@/components/form/NoticeFormFields';
import type { FocusRequest } from '@/components/form/NoticeFormFields';
import { RecordResetDialog } from '@/components/form/RecordResetDialog';
import { UnbackedSaveDialog } from '@/components/form/UnbackedSaveDialog';
import { useNoticeFormState } from '@/components/form/useNoticeFormState';
import { useNoticeSubmit } from '@/components/form/useNoticeSubmit';
import { readRouteState } from '@/lib/routeState';
import type { Notice } from '@/lib/types';
import { useNotices } from '@/lib/useNotices';

const TITLE = '고지서 수정';

function EditForm({ notice }: { notice: Notice }) {
  const { state } = useLocation();
  const wantsPaymentFocus = readRouteState(state).focus === 'paymentDeadline';
  const initialFocus = useMemo<FocusRequest | null>(
    () => (wantsPaymentFocus ? { field: 'paymentDeadline', seq: 0 } : null),
    [wantsPaymentFocus],
  );

  const formState = useNoticeFormState(notice);
  const {
    submit,
    focusRequest,
    unbackedOpen,
    confirmDiscard,
    closeUnbacked,
    resetOpen,
    confirmReset,
    closeReset,
  } = useNoticeSubmit(formState, { id: notice.id, original: notice });

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{TITLE}</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="저장" onClick={submit} />}
    >
      <NoticeFormFields formState={formState} focusRequest={focusRequest ?? initialFocus} />
      <RecordResetDialog open={resetOpen} onConfirm={confirmReset} onClose={closeReset} />
      <UnbackedSaveDialog open={unbackedOpen} onConfirm={confirmDiscard} onClose={closeUnbacked} />
    </ScreenScaffold>
  );
}

/**
 * S3. 고지서 수정 — /notice/:id/edit
 * 저장값으로 등록 폼을 프리필한다. 없는 id·손상·접근 불가·새 버전이면 폼 없이 StatusState만 보인다.
 */
export default function NoticeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { result, findById } = useNotices();
  const notice = findById(id);

  if (result.unavailable || result.newerVersion || result.corrupted || !notice) {
    const variant = result.unavailable ? 'unavailable' : result.newerVersion ? 'newer' : 'notFound';
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{TITLE}</Top.TitleParagraph>} />}>
        <StatusState
          variant={variant}
          actionLabel="홈으로"
          onAction={() => navigate('/', { replace: true })}
        />
      </ScreenScaffold>
    );
  }

  return <EditForm notice={notice} />;
}
