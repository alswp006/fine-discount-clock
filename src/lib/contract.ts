/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** StatusState variant 값. 0009, 0016, 0017, 0018이 참조한다. (구현: 패킷 0007) */
export type StatusVariant = 'notFound' | 'unavailable' | 'newer' | 'route404' | 'renderError';

/** Array.from 기준 글자 수. (구현: 패킷 0002) */
export type countCharsFn = (s: string) => number;

/** YYYY-MM-DD 형식이면서 실제 달력 날짜인지 판정. (구현: 패킷 0002) */
export type isValidYmdFn = (s: string) => boolean;

/** YYYY-MM-DD 입력, YYYY-MM-DD 출력. (구현: 패킷 0002) */
export type addYearsFn = (ymd: string, years: number) => string;

/** YYYY-MM-DD 입력, YYYY-MM-DD 출력. (구현: 패킷 0002) */
export type addDaysFn = (ymd: string, days: number) => string;

/** 로컬 날짜를 YYYY-MM-DD로 반환. (구현: 패킷 0002) */
export type todayYmdFn = () => string;

/** toLocaleString('ko-KR') 후 '원'을 붙인다. (구현: 패킷 0002) */
export type formatWonFn = (amount: number) => string;

/** '2026.10.20(화)' 형식. (구현: 패킷 0002) */
export type formatDateDotFn = (ymd: string) => string;

/** 'D-11', 'D-DAY', 'D+1' 형식. days는 마감일까지 남은 일수로 가정. (구현: 패킷 0002) */
export type formatDdayFn = (days: number) => string;

/** TodayContext Provider가 주입한 오늘 날짜(YYYY-MM-DD)를 반환한다. (구현: 패킷 0006) */
export type useTodayFn = () => string;
