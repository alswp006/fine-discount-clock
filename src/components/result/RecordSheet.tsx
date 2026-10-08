import { useState } from 'react';
import { BottomSheet, Button, ListRow } from '@toss/tds-mobile';
import { useRecordActions } from '@/components/result/useRecordActions';
import type { RecordOption } from '@/components/result/useRecordActions';
import type { Notice } from '@/lib/types';

interface RecordSheetProps {
  notice: Notice;
  /** 기록이 저장된 직후 — 부모가 고지서를 다시 읽을 때 쓴다 */
  onRecorded?: () => void;
}

/** '납부·결정 기록' 버튼과, 누르면 열리는 시점별 옵션 시트 */
export function RecordSheet({ notice, onRecorded }: RecordSheetProps) {
  const [open, setOpen] = useState(false);
  const { options, record } = useRecordActions(notice, onRecorded);

  const pick = (option: RecordOption) => {
    record(option);
    setOpen(false);
  };

  return (
    <>
      <Button variant="weak" display="block" onClick={() => setOpen(true)}>
        납부·결정 기록
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        header={<BottomSheet.Header>납부·결정 기록</BottomSheet.Header>}
      >
        {options.map((option) => (
          <ListRow
            key={option.key}
            onClick={() => pick(option)}
            contents={<ListRow.Texts type="1RowTypeA" top={option.label} />}
          />
        ))}
      </BottomSheet>
    </>
  );
}

export default RecordSheet;
