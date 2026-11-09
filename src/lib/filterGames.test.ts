import type { Game } from '@/types/game';
import { ALL_CATEGORY, filterGames } from './filterGames';

const games: Game[] = [
  { id: 'a', title: 'Block Breaker', image: '', categoryIds: ['action'] },
  { id: 'b', title: 'ナンバーマージ', image: '', categoryIds: ['puzzle', 'brain'] },
  { id: 'c', title: '15パズル', image: '', categoryIds: ['puzzle'] },
];

const ids = (list: Game[]) => list.map((g) => g.id);

describe('filterGames', () => {
  it('条件なしなら全件を返す', () => {
    expect(ids(filterGames(games, '', ALL_CATEGORY))).toEqual(['a', 'b', 'c']);
  });

  it('ゲーム名の部分一致で絞り込む', () => {
    expect(ids(filterGames(games, 'パズ', ALL_CATEGORY))).toEqual(['c']);
  });

  it('大文字小文字を区別しない', () => {
    expect(ids(filterGames(games, 'bLoCk', ALL_CATEGORY))).toEqual(['a']);
  });

  it('前後の空白を除く', () => {
    expect(ids(filterGames(games, '  breaker 　', ALL_CATEGORY))).toEqual(['a']);
  });

  it('空白だけの検索語は条件なしとして扱う', () => {
    expect(ids(filterGames(games, '   ', ALL_CATEGORY))).toEqual(['a', 'b', 'c']);
  });

  it('カテゴリで絞り込む', () => {
    expect(ids(filterGames(games, '', 'puzzle'))).toEqual(['b', 'c']);
  });

  it('検索とカテゴリは AND 条件', () => {
    expect(ids(filterGames(games, 'マージ', 'puzzle'))).toEqual(['b']);
    expect(ids(filterGames(games, 'マージ', 'action'))).toEqual([]);
  });
});
