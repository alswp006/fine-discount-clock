import { ConfirmDialog } from '@toss/tds-mobile';

interface UnbackedSaveDialogProps {
  open: boolean;
  /** '저장하기' — 이전 데이터를 지우고 저장한다 */
  onConfirm: () => void;
  /** '닫기' · 딤 클릭 · 뒤로가기 — 저장하지 않는다 */
  onClose: () => void;
}

/** 백업하지 못한 손상 데이터 위에 저장하기 전 확인 (SPEC F2-AC-15) */
export function UnbackedSaveDialog({ open, onConfirm, onClose }: UnbackedSaveDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={<ConfirmDialog.Title>저장하면 이전 데이터가 지워져요</ConfirmDialog.Title>}
      description={
        <ConfirmDialog.Description>
          읽을 수 없던 이전 데이터를 백업하지 못했어요. 지운 데이터는 되돌릴 수 없어요.
        </ConfirmDialog.Description>
      }
      cancelButton={<ConfirmDialog.CancelButton onClick={onClose}>닫기</ConfirmDialog.CancelButton>}
      confirmButton={<ConfirmDialog.ConfirmButton onClick={onConfirm}>저장하기</ConfirmDialog.ConfirmButton>}
    />
  );
}

export default UnbackedSaveDialog;
