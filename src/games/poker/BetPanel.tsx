import { useEffect, useRef } from 'react';
import type { BetPanel as BetPanelState } from './game';
import styles from './Poker.module.scss';

export type BetPanelProps = {
  bet: BetPanelState;
  onKey: (key: string) => void;
  onStep: (delta: number) => void;
  onPreset: (preset: 'min' | 'half' | 'max') => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const fmt = (n: number) => n.toLocaleString();
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** 賭け金パネル（電卓）（design/games/ポーカー.md §4-5） */
export function BetPanel({ bet, onKey, onStep, onPreset, onCancel, onConfirm }: BetPanelProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const valid = bet.value >= bet.min && bet.value <= bet.max;
  const raise = bet.kind === 'raise';

  // 開いたら確定ボタンにフォーカス（数字はキーボードからも入力できる）
  useEffect(() => {
    confirmRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.betPanel} role="dialog" aria-label="賭け金の入力">
      <p className={styles.betTitle}>{raise ? `レイズ：コール ${fmt(bet.toCall)} に上乗せする額` : 'ベット額'}</p>
      <div className={styles.betValue}>
        <button type="button" className={styles.padKey} aria-label="100減らす" onClick={() => onStep(-100)}>
          −
        </button>
        <output className={valid ? undefined : styles.invalid} aria-live="polite">
          {fmt(bet.value)}
        </output>
        <button type="button" className={styles.padKey} aria-label="100増やす" onClick={() => onStep(100)}>
          ＋
        </button>
      </div>
      <p className={styles.betRange}>
        {fmt(bet.min)}〜{fmt(bet.max)} コイン
      </p>
      <div className={styles.keypad}>
        {KEYS.map((k) => (
          <button key={k} type="button" className={styles.padKey} onClick={() => onKey(k)}>
            {k}
          </button>
        ))}
        <button type="button" className={styles.padKey} onClick={() => onKey('C')}>
          C
        </button>
        <button type="button" className={styles.padKey} onClick={() => onKey('0')}>
          0
        </button>
        <button type="button" className={styles.padKey} aria-label="1文字消す" onClick={() => onKey('BS')}>
          ⌫
        </button>
      </div>
      <div className={styles.presets}>
        <button type="button" className={styles.padKey} onClick={() => onPreset('min')}>
          MIN
        </button>
        <button type="button" className={styles.padKey} onClick={() => onPreset('half')}>
          POT½
        </button>
        <button type="button" className={styles.padKey} onClick={() => onPreset('max')}>
          MAX
        </button>
      </div>
      <div className={`${styles.betActions} ${bet.mustBet ? styles.single : ''}`}>
        {/* 1回目の親は必ず賭けるので「戻る」なし。2回目の親は「戻る」の代わりに「チェック」 */}
        {!bet.mustBet && (
          <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={onCancel}>
            {bet.opening ? 'チェック' : '戻る'}
          </button>
        )}
        <button
          ref={confirmRef}
          type="button"
          className={`${styles.btn} ${styles.primary}`}
          disabled={!valid}
          onClick={onConfirm}
        >
          {raise ? 'レイズ' : 'ベット'} <b>{fmt(bet.value)}</b>
        </button>
      </div>
    </div>
  );
}
