import { ConfirmDialog } from '@toss/tds-mobile';

interface RecordResetDialogProps {
  open: boolean;
  /** '바꾸기' — 납부 기록을 지우고 open으로 되돌려 저장한다 */
  onConfirm: () => void;
  /** '취소' · 딤 클릭 · 뒤로가기 — 저장하지 않는다 */
  onClose: () => void;
}

/** 납부 기록이 있는 고지서의 금액·기한을 바꿔 저장하기 전 확인 */
export function RecordResetDialog({ open, onConfirm, onClose }: RecordResetDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={<ConfirmDialog.Title>금액이나 기한을 바꾸면 납부 기록이 초기화돼요</ConfirmDialog.Title>}
      description={
        <ConfirmDialog.Description>
          납부·의견제출 기록과 아낀 금액이 지워지고 처리 전 상태로 돌아가요.
        </ConfirmDialog.Description>
      }
      cancelButton={<ConfirmDialog.CancelButton onClick={onClose}>취소</ConfirmDialog.CancelButton>}
      confirmButton={<ConfirmDialog.ConfirmButton onClick={onConfirm}>바꾸기</ConfirmDialog.ConfirmButton>}
    />
  );
}

export default RecordResetDialog;
