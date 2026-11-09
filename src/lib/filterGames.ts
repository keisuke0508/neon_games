import type { Game } from '@/types/game';

/** カテゴリ未選択（ALL）を表す値 */
export const ALL_CATEGORY = 'all';

/**
 * ゲーム名（前後空白を除き、大文字小文字を区別しない部分一致）と
 * カテゴリ（単一選択）の AND 条件で絞り込む。
 */
export function filterGames(list: readonly Game[], query: string, categoryId: string): Game[] {
  const q = query.trim().toLowerCase();
  return list.filter(
    (game) =>
      (categoryId === ALL_CATEGORY || game.categoryIds.includes(categoryId)) &&
      (q === '' || game.title.toLowerCase().includes(q)),
  );
}
