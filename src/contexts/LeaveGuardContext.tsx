'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

/**
 * ゲームページからの離脱ガード（docs/design.md §4「ゲームページからの離脱」）。
 * ゲームページが useLeaveGuard(handler) でハンドラを登録している間、
 * ヘッダーのロゴ・フッターの「ゲーム一覧」は遷移せずにハンドラ（ConfirmModal を開く）を呼ぶ。
 */
type LeaveGuardContextValue = {
  /** ガード中ならハンドラを呼んで true を返す。ガードしていなければ false */
  requestLeave: () => boolean;
  register: (handler: () => void) => () => void;
};

const LeaveGuardContext = createContext<LeaveGuardContextValue | null>(null);

export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<(() => void) | null>(null);

  const register = useCallback((handler: () => void) => {
    handlerRef.current = handler;
    return () => {
      if (handlerRef.current === handler) handlerRef.current = null;
    };
  }, []);

  const requestLeave = useCallback(() => {
    if (!handlerRef.current) return false;
    handlerRef.current();
    return true;
  }, []);

  const value = useMemo(() => ({ register, requestLeave }), [register, requestLeave]);

  return <LeaveGuardContext.Provider value={value}>{children}</LeaveGuardContext.Provider>;
}

function useLeaveGuardContext(): LeaveGuardContextValue {
  const ctx = useContext(LeaveGuardContext);
  if (!ctx) throw new Error('LeaveGuardProvider が見つかりません');
  return ctx;
}

/** 画面内の TOP への遷移を、handler の呼び出しに置き換える */
export function useLeaveGuard(handler: () => void): void {
  const { register } = useLeaveGuardContext();
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => register(() => latest.current()), [register]);
}

/** ガード中なら離脱を要求する関数を返す */
export function useRequestLeave(): () => boolean {
  return useLeaveGuardContext().requestLeave;
}
