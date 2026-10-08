import type { RouteState } from '@/lib/types';

/** location.state를 안전하게 읽는다. 객체가 아니거나 타입이 맞지 않는 필드는 버린다. */
export function readRouteState(raw: unknown): RouteState {
  if (typeof raw !== 'object' || raw === null) return {};
  const src = raw as Record<string, unknown>;
  const state: RouteState = {};
  if (src.justSaved === true) state.justSaved = true;
  if (src.focus === 'paymentDeadline') state.focus = 'paymentDeadline';
  if (typeof src.deletedName === 'string') state.deletedName = src.deletedName;
  return state;
}
