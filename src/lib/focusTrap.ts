import type { KeyboardEvent } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** モーダル内で Tab / Shift+Tab のフォーカスを循環させる（onKeyDown から呼ぶ） */
export function trapFocus(e: KeyboardEvent<HTMLElement>, container: HTMLElement | null): void {
  if (e.key !== 'Tab' || !container) return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  const outside = !container.contains(active);
  if (e.shiftKey && (active === first || outside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || outside)) {
    e.preventDefault();
    first.focus();
  }
}
