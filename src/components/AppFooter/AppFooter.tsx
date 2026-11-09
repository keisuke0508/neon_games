import Link from 'next/link';
import { TopLink } from '../TopLink';
import styles from './AppFooter.module.scss';

/** 共通フッター（docs/design.md §2 AppFooter） */
export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <nav className={styles.nav} aria-label="フッター">
          <TopLink className={styles.link}>ゲーム一覧</TopLink>
          <Link href="/terms" className={styles.link}>
            利用規約
          </Link>
          <Link href="/privacy_policy" className={styles.link}>
            プライバシー
          </Link>
        </nav>
        <small className={styles.copyright}>© 2026 NEON_GAMES</small>
      </div>
    </footer>
  );
}
