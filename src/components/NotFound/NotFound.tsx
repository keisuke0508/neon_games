import { AppButton } from '../AppButton';
import styles from './NotFound.module.scss';

/** 404 表示（docs/design.md §5 NotFound。PM 確認待ちの暫定デザイン） */
export function NotFound() {
  return (
    <section className={styles.notFound}>
      <p className={styles.code}>404</p>
      <h1 className={styles.heading}>GAME NOT FOUND</h1>
      <p className={styles.text}>お探しのゲームは見つかりませんでした。</p>
      <AppButton href="/">TOPに戻る</AppButton>
    </section>
  );
}
