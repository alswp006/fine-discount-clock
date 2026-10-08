import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@toss/tds-mobile';
import { logClick } from '@/lib/analytics';
import { INPUT_LIMITS } from '@/lib/fineRules';
import { storeErrorMessage } from '@/lib/messages';

/** 고지서 등록 동작 — 50장이면 이동 없이 Toast, 아니면 로그 후 등록 화면으로 */
export function useAddNotice(noticeCount: number): () => void {
  const navigate = useNavigate();
  const toast = useToast();

  return useCallback(() => {
    if (noticeCount >= INPUT_LIMITS.MAX_NOTICES) {
      toast.openToast(storeErrorMessage('limit'));
      return;
    }
    logClick('home_add_notice');
    navigate('/notice/new');
  }, [noticeCount, navigate, toast]);
}
