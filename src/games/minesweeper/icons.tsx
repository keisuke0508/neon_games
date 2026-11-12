// アイコン（モックの ms.js の ICON をそのまま使用）
import styles from './Minesweeper.module.scss';

type IconProps = { className?: string };

export function FlagIcon({ className }: IconProps) {
  return (
    <svg className={`${styles.icFlag} ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path className={styles.icPole} d="M6 2h2v20H6z" />
      <path className={styles.icCloth} d="M8 3l12 5-12 5z" />
      <path className={styles.icBase} d="M3 20h8v2H3z" />
    </svg>
  );
}

export function MineIcon({ className }: IconProps) {
  return (
    <svg className={`${styles.icMine} ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        className={styles.icSpike}
        d="M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4zM15.6 17l1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4-2.8 2.8z"
      />
      <circle className={styles.icBody} cx="12" cy="12" r="6.5" />
      <circle className={styles.icShine} cx="9.6" cy="9.6" r="1.8" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3h2v5.6l3.7 2.2-1 1.7L11 13.7z" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3 2 11.5l1.3 1.5L5 11.6V21h5.5v-6h3v6H19v-9.4l1.7 1.4 1.3-1.5z" />
    </svg>
  );
}
