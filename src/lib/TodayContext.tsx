import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { todayYmd } from '@/lib/dateUtils';

const TodayContext = createContext<string | null>(null);

interface TodayProviderProps {
  /** 주입할 오늘 날짜(YYYY-MM-DD). 없으면 마운트 시점의 로컬 날짜 */
  value?: string;
  children: ReactNode;
}

export function TodayProvider({ value, children }: TodayProviderProps) {
  const [fallback] = useState(() => todayYmd());
  return <TodayContext.Provider value={value ?? fallback}>{children}</TodayContext.Provider>;
}

/** Provider가 주입한 오늘 날짜. Provider 밖이면 호출 시점의 로컬 날짜 */
export function useToday(): string {
  const injected = useContext(TodayContext);
  return injected ?? todayYmd();
}
