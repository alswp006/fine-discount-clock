import { Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { NoticeFormFields } from '@/components/form/NoticeFormFields';
import { UnbackedSaveDialog } from '@/components/form/UnbackedSaveDialog';
import { useNoticeFormState } from '@/components/form/useNoticeFormState';
import { useNoticeSubmit } from '@/components/form/useNoticeSubmit';

/**
 * S2. 고지서 등록 — /notice/new
 * 입력 상태는 useNoticeFormState, 제출(검증 → 저장 → Toast/이동)은 useNoticeSubmit이 맡는다.
 * 저장소가 손상('unbacked')이면 이동 없이 UnbackedSaveDialog로 덮어쓰기 여부를 묻는다.
 */
export default function NoticeCreate() {
  const formState = useNoticeFormState();
  const { submit, focusRequest, unbackedOpen, confirmDiscard, closeUnbacked } =
    useNoticeSubmit(formState);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>고지서 등록</Top.TitleParagraph>} />}
      flush
      bottom={<SubmitFooter label="저장" onClick={submit} />}
    >
      <NoticeFormFields formState={formState} focusRequest={focusRequest} />
      <UnbackedSaveDialog
        open={unbackedOpen}
        onConfirm={confirmDiscard}
        onClose={closeUnbacked}
      />
    </ScreenScaffold>
  );
}
