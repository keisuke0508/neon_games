import type { CSSProperties } from 'react';
import { cardColor, cardLabel, rankText, SUIT_SYMBOL, type Card } from './cards';
import styles from './PlayingCard.module.scss';

type Common = {
  card: Card;
  down?: boolean;
  /** 配る動きの遅れ(ms)。null なら配る動きなし */
  dealDelay?: number | null;
  leaving?: boolean;
  /** 裏返す動きの遅れ(ms) */
  flipDelay?: number;
  className?: string;
};

type ButtonCard = Common & {
  as: 'button';
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
};

type StaticCard = Common & { as?: 'div' };

export type PlayingCardProps = ButtonCard | StaticCard;

/** トランプ1枚（design/games/ポーカー.md §4-1）。大きさは親の font-size（= カードの幅） */
export function PlayingCard(props: PlayingCardProps) {
  const { card, down = false, dealDelay = null, leaving = false, flipDelay = 0, className } = props;
  const classNames = [
    styles.card,
    down && styles.down,
    dealDelay !== null && styles.dealing,
    leaving && styles.leaving,
    props.as === 'button' && props.selected && styles.selected,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const style = { '--deal-delay': `${dealDelay ?? 0}ms` } as CSSProperties;

  const inner = (
    <span className={styles.inner} style={{ transitionDelay: `${flipDelay}ms` }}>
      <span className={`${styles.face} ${styles.front}`}>
        {card.joker ? (
          <>
            <span className={`${styles.rank} ${styles.jokerRank}`}>JOKER</span>
            <span className={styles.pip}>★</span>
          </>
        ) : (
          <>
            <span className={styles.rank}>
              {rankText(card.rank)}
              <i>{SUIT_SYMBOL[card.suit]}</i>
            </span>
            <span className={styles.pip}>{SUIT_SYMBOL[card.suit]}</span>
          </>
        )}
      </span>
      <span className={`${styles.face} ${styles.back}`} />
    </span>
  );

  if (props.as === 'button') {
    return (
      <button
        type="button"
        className={classNames}
        style={style}
        data-color={cardColor(card)}
        aria-label={cardLabel(card)}
        aria-pressed={props.selected}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {inner}
      </button>
    );
  }
  return (
    <div
      className={classNames}
      style={style}
      data-color={cardColor(card)}
      role="img"
      aria-label={down ? '伏せたカード' : cardLabel(card)}
    >
      {inner}
    </div>
  );
}
