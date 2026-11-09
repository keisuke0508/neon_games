import { categories } from '@/data/categories';
import { games } from '@/data/games';
import { GameList } from '@/features/top/GameList';
import styles from './page.module.scss';

export default function TopPage() {
  return (
    <div className="container">
      <section className={styles.hero}>
        <p className={styles.kicker}>FOR FREE</p>
        <h1 className={styles.heading}>
          ログイン不要、無料で遊べる<span className={styles.accent}>ゲームセンター</span>
        </h1>
      </section>
      <GameList games={games} categories={categories} />
    </div>
  );
}
