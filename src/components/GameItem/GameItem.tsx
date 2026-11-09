'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { Category, Game } from '@/types/game';
import styles from './GameItem.module.scss';

export type GameItemProps = {
  game: Game;
  /** game.categoryIds に対応するカテゴリ（タグ表示用） */
  categories: Category[];
  /** 画面内で先に表示される画像は true（LCP 対策） */
  priority?: boolean;
};

/** ゲーム画像とゲーム名の組み合わせ（docs/design.md §5 GameItem） */
export function GameItem({ game, categories, priority = false }: GameItemProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = game.image !== '' && !imageFailed;
  const tags = game.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => c !== undefined);

  return (
    <Link href={`/game/${game.id}`} className={styles.item}>
      <div className={styles.thumb}>
        {showImage && (
          <Image
            src={game.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
            className={styles.image}
            priority={priority}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.title}>{game.title}</p>
        {tags.length > 0 && (
          <ul className={styles.tags}>
            {tags.map((c) => (
              <li key={c.id} className={styles.tag}>
                {c.categoryName}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
