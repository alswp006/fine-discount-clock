import { useRef, useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { logClick } from '@/lib/analytics';
import { shareApp } from '@/lib/share';

/** '공유하기' 버튼 — 공유 시트가 처리되는 동안 loading이라 연타해도 한 번만 부른다 */
export function ShareButton() {
  const [loading, setLoading] = useState(false);
  // state는 다음 렌더에야 바뀐다 — 같은 틱의 연타는 ref로 막는다
  const busy = useRef(false);

  const handleClick = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      logClick('result_share');
      await shareApp({ message: '과태료 감경 마감까지 며칠 남았는지, 늦으면 얼마가 붙는지 계산해 봤어요', path: '/' });
    } catch {
      // 공유 실패는 화면에 영향을 주지 않는다 — 버튼만 원상복구
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <Button variant="fill" display="block" loading={loading} onClick={handleClick}>
      공유하기
    </Button>
  );
}

export default ShareButton;
