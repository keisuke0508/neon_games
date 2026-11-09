'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { trapFocus } from '@/lib/focusTrap';
import { AppButton } from '../AppButton';
import styles from './ConfirmModal.module.scss';

export type ConfirmModalProps = {
  isOpen: boolean;
  title: ReactNode;
  message?: ReactNode;
  /** タイトル上の英字ラベル（例: QUIT GAME?） */
  kicker?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 「はい」「いいえ」の確認モーダル（docs/design.md §5 ConfirmModal） */
export function ConfirmModal({
  isOpen,
  title,
  message,
  kicker,
  confirmLabel = 'はい',
  cancelLabel = 'いいえ',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // 開いたら「いいえ」にフォーカス、閉じたら開く前の要素へ戻す。背面スクロールを止める
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  // Esc で閉じる（フォーカスがモーダル外にあっても効くよう document で拾う）
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(e) => trapFocus(e, panelRef.current)}>
      <div className={styles.backdrop} onClick={onCancel} data-testid="confirm-modal-backdrop" />
      <div className={styles.panel} ref={panelRef}>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <p id={titleId} className={styles.title}>
          {title}
        </p>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <AppButton variant="secondary" onClick={onCancel} ref={cancelRef}>
            {cancelLabel}
          </AppButton>
          <AppButton variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
