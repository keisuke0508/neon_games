import { TopLink } from '../TopLink';
import styles from './AppHeader.module.scss';

/** 共通ヘッダー（docs/design.md §2 AppHeader） */
export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <TopLink className={styles.logo} aria-label="NEON_GAMES">
          NEON<span className={styles.underscore}>_</span>GAMES
        </TopLink>
      </div>
    </header>
  );
}
