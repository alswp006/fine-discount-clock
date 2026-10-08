import { useCallback, useState } from 'react';
import { useToday } from '@/lib/TodayContext';
import { deleteNotice, loadNotices, saveNotice, updateStatus } from '@/lib/noticeStore';
import type { DeleteResult, SaveOptions, SaveResult, UpdateStatusResult } from '@/lib/noticeStore';
import type { LoadResult, Notice, NoticeInput, NoticeStatus } from '@/lib/types';

export interface UseNotices {
  result: LoadResult;
  notices: Notice[];
  today: string;
  reload: () => void;
  findById: (id: string | undefined) => Notice | null;
  save: (input: NoticeInput, id?: string, opts?: SaveOptions) => SaveResult;
  updateStatus: (id: string, status: NoticeStatus) => UpdateStatusResult;
  remove: (id: string) => DeleteResult;
}

/** 저장소를 동기로 읽는다(스피너 없음). 쓰기가 성공하면 다시 읽어 상태에 반영한다. */
export function useNotices(): UseNotices {
  const today = useToday();
  const [result, setResult] = useState<LoadResult>(() => loadNotices());

  const reload = useCallback(() => setResult(loadNotices()), []);

  const findById = useCallback(
    (id: string | undefined): Notice | null =>
      id === undefined ? null : (result.notices.find((n) => n.id === id) ?? null),
    [result],
  );

  const save = useCallback(
    (input: NoticeInput, id?: string, opts?: SaveOptions): SaveResult => {
      const res = saveNotice(input, id, opts);
      if (res.ok) reload();
      return res;
    },
    [reload],
  );

  const changeStatus = useCallback(
    (id: string, status: NoticeStatus): UpdateStatusResult => {
      const res = updateStatus(id, status, today);
      if (res.ok) reload();
      return res;
    },
    [reload, today],
  );

  const remove = useCallback(
    (id: string): DeleteResult => {
      const res = deleteNotice(id);
      if (res.ok) reload();
      return res;
    },
    [reload],
  );

  return {
    result,
    notices: result.notices,
    today,
    reload,
    findById,
    save,
    updateStatus: changeStatus,
    remove,
  };
}
