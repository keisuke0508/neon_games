'use client';

import { useEffect, useId, useRef } from 'react';
import { trapFocus } from '@/lib/focusTrap';
import { ShareButtons } from '../ShareButtons';
import styles from './ResultModal.module.scss';

export type ResultModalProps = {
  isOpen: boolean;
  /** スコアの見出し（例: 逃げた距離） */
  scoreLabel: string;
  score: number;
  /** スコアの単位（例: m） */
  unit?: string;
  /** ShareButtons に渡す文章 */
  shareText: string;
  /** シェアする URL。省略時は現在のページ */
  shareUrl?: string;
  retryLabel?: string;
  onRetry: () => void;
};

/**
 * ゲーム終了モーダル（docs/design.md §5 ResultModal）。
 * GameFrame の中に重ねて表示する。背景クリックや Esc では閉じない。
 */
export function ResultModal({
  isOpen,
  scoreLabel,
  score,
  unit,
  shareText,
  shareUrl,
  retryLabel = 'もう1度プレイする',
  onRetry,
}: ResultModalProps) {
  const labelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  // 開いたら「もう1度プレイする」にフォーカス（Space / Enter ですぐ再スタートできる）
  useEffect(() => {
    if (isOpen) retryRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.modal}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      onKeyDown={(e) => trapFocus(e, panelRef.current)}
    >
      <div className={styles.panel} ref={panelRef}>
        <p id={labelId} className={styles.label}>
          {scoreLabel}
        </p>
        <p className={styles.score}>
          {score.toLocaleString()}
          {unit && <small className={styles.unit}>{unit}</small>}
        </p>
        <button type="button" ref={retryRef} className={styles.retry} onClick={onRetry}>
          {retryLabel}
        </button>
        <ShareButtons text={shareText} url={shareUrl} className={styles.share} />
      </div>
    </div>
  );
}
