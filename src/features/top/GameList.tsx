'use client';

import { useMemo, useState } from 'react';
import { CategoryChips } from '@/components/CategoryChips';
import { GameItem } from '@/components/GameItem';
import { SearchBox } from '@/components/SearchBox';
import { ALL_CATEGORY, filterGames } from '@/lib/filterGames';
import type { Category, Game } from '@/types/game';
import styles from './GameList.module.scss';

export type GameListProps = {
  games: Game[];
  categories: Category[];
};

/**
 * TOP の検索・カテゴリ・件数・グリッド（docs/design.md §3）。
 * 絞り込み状態は画面内の state だけで持ち、URL には載せない。
 */
export function GameList({ games, categories }: GameListProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState(ALL_CATEGORY);
  const filtered = useMemo(() => filterGames(games, query, categoryId), [games, query, categoryId]);

  return (
    <>
      <div className={styles.filters}>
        <SearchBox value={query} onChange={setQuery} />
        <CategoryChips categories={categories} selectedId={categoryId} onChange={setCategoryId} />
      </div>
      <p className={styles.count} aria-live="polite">
        {filtered.length} GAMES
      </p>
      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map((game, i) => (
            <GameItem key={game.id} game={game} categories={categories} priority={i < 5} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>NO GAME FOUND — 別のキーワードで探してみてください</p>
      )}
    </>
  );
}
