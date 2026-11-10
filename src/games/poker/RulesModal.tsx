import { useEffect, useId, useRef } from 'react';
import { trapFocus } from '@/lib/focusTrap';
import { parseHand } from './cards';
import { HANDS } from './hands';
import { PlayingCard } from './PlayingCard';
import { ANTE, ROUNDS, START_COINS } from './rules';
import styles from './Poker.module.scss';

export type RulesModalProps = {
  onClose: () => void;
};

const STRONG_FIRST = [...HANDS].reverse();

/** ルール説明モーダル（design/games/ポーカー.md §3-11） */
export function RulesModal({ onClose }: RulesModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 開いたら × にフォーカスし、閉じたら開く前の要素に戻す
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className={`${styles.layer} ${styles.rules}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(e) => trapFocus(e, panelRef.current)}
    >
      <div className={styles.rulesPanel} ref={panelRef}>
        <div className={styles.rulesHead}>
          <h2 id={titleId}>ルール説明</h2>
          <button ref={closeRef} type="button" className={styles.rulesClose} aria-label="閉じる" onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.rulesBody}>
          <section>
            <h3>あそびかた</h3>
            <ul>
              <li>
                CPU と1対1で、<b>{ROUNDS}回戦</b>のポーカーで勝負します。お互い{' '}
                <b>{START_COINS.toLocaleString()}コイン</b>から始まります
              </li>
              <li>
                毎回、参加費として <b>{ANTE}コイン</b>を出し、5枚ずつカードが配られます
              </li>
              <li>
                <b>親</b>が先に賭けます。相手は <b>コール</b>（同じ額を賭ける）、<b>レイズ</b>（上乗せする）、
                <b>フォールド</b>（降りる）から選びます
              </li>
              <li>
                いらないカードを選んで <b>交換</b>できます（0〜5枚）。そのあと、もう一度賭けます
              </li>
              <li>
                最後に手札を見せ合い、強い役の人が賭けたコイン（POT）をすべてもらいます。降りた人は、それまでに賭けたコインを失います
              </li>
              <li>
                ジョーカーは2枚入っていて、<b>どのカードの代わりにもなります</b>
              </li>
              <li>{ROUNDS}回戦が終わったときのコインの枚数が、あなたのスコアです</li>
            </ul>
          </section>
          <section>
            <h3>役の一覧（強い順）</h3>
            <ol className={styles.hands}>
              {STRONG_FIRST.map((h, i) => (
                <li key={h.name}>
                  <span className={styles.handsNo}>{i + 1}</span>
                  <span className={styles.handsName}>
                    {h.name}
                    <small>{h.desc}</small>
                  </span>
                  <span className={styles.handsExample}>
                    {parseHand(h.example).map((c, k) => (
                      <PlayingCard key={k} card={c} />
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
