import { useState } from 'react';
import { Button, ConfirmDialog, useToast } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { logClick } from '@/lib/analytics';
import { storeErrorMessage } from '@/lib/messages';
import { deleteNotice } from '@/lib/noticeStore';
import type { Notice, RouteState } from '@/lib/types';

interface DeleteNoticeButtonProps {
  notice: Notice;
}

/** '삭제' 버튼과, 누르면 열리는 삭제 확인 다이얼로그 */
export function DeleteNoticeButton({ notice }: DeleteNoticeButtonProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { openToast } = useToast();

  const close = () => setOpen(false);

  const confirm = () => {
    setOpen(false);
    const res = deleteNotice(notice.id);
    if (!res.ok) {
      openToast(storeErrorMessage(res.error));
      return;
    }
    logClick('delete_notice');
    const state: RouteState = { deletedName: notice.name };
    navigate('/', { replace: true, state });
  };

  return (
    <>
      <Button variant="weak" display="block" onClick={() => setOpen(true)}>
        삭제
      </Button>
      <ConfirmDialog
        open={open}
        onClose={close}
        title={<ConfirmDialog.Title>{`'${notice.name}' 고지서를 삭제할까요?`}</ConfirmDialog.Title>}
        cancelButton={<ConfirmDialog.CancelButton onClick={close}>닫기</ConfirmDialog.CancelButton>}
        confirmButton={<ConfirmDialog.ConfirmButton onClick={confirm}>삭제</ConfirmDialog.ConfirmButton>}
      />
    </>
  );
}
