'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { useRequestLeave } from '@/contexts/LeaveGuardContext';

export type TopLinkProps = {
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
};

/**
 * TOP（/）へのリンク。ゲームページでは遷移せずに ConfirmModal を開く
 * （docs/design.md §4「ゲームページからの離脱」）。
 */
export function TopLink({ className, children, 'aria-label': ariaLabel }: TopLinkProps) {
  const requestLeave = useRequestLeave();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // 新しいタブで開く操作（Ctrl/Cmd/Shift/中クリック）はゲームを離脱しないので止めない
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (requestLeave()) e.preventDefault();
  };

  return (
    <Link href="/" className={className} aria-label={ariaLabel} onClick={handleClick}>
      {children}
    </Link>
  );
}
