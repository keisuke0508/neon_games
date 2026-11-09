'use client';

import type { FormEvent } from 'react';
import styles from './SearchBox.module.scss';

export type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
};

/** ゲーム名の検索ボックス（docs/design.md §3 SearchBox）。入力のたびに onChange を呼ぶ */
export function SearchBox({ value, onChange }: SearchBoxProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => e.preventDefault();

  return (
    <form className={styles.search} role="search" onSubmit={handleSubmit}>
      <span className={styles.label} aria-hidden="true">
        SEARCH
      </span>
      <input
        className={styles.input}
        type="search"
        placeholder="ゲーム名を入力"
        aria-label="ゲーム名でさがす"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </form>
  );
}
