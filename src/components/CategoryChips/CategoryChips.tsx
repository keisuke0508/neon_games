'use client';

import { ALL_CATEGORY } from '@/lib/filterGames';
import type { Category } from '@/types/game';
import styles from './CategoryChips.module.scss';

export type CategoryChipsProps = {
  categories: Category[];
  /** 選択中のカテゴリ id。ALL は ALL_CATEGORY */
  selectedId: string;
  onChange: (categoryId: string) => void;
};

/** カテゴリの単一選択チップ（docs/design.md §3 CategoryChips）。先頭は ALL */
export function CategoryChips({ categories, selectedId, onChange }: CategoryChipsProps) {
  const chips = [{ id: ALL_CATEGORY, categoryName: 'ALL' }, ...categories];

  return (
    <div className={styles.chips} role="group" aria-label="カテゴリ">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className={styles.chip}
          aria-pressed={selectedId === c.id}
          onClick={() => onChange(c.id)}
        >
          {c.categoryName}
        </button>
      ))}
    </div>
  );
}
