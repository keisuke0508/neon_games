import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Category, Game } from '@/types/game';
import { GameList } from './GameList';

const categories: Category[] = [
  { id: 'puzzle', categoryName: 'パズル' },
  { id: 'action', categoryName: 'アクション' },
];
const games: Game[] = [
  { id: 'a', title: 'ブロックくずし', image: '', categoryIds: ['action'] },
  { id: 'b', title: '15パズル', image: '', categoryIds: ['puzzle'] },
  { id: 'c', title: 'スライドパズル', image: '', categoryIds: ['puzzle', 'action'] },
];

const gameLinks = () => screen.queryAllByRole('link').map((a) => a.getAttribute('href'));

describe('GameList', () => {
  it('初期状態では全件と件数を表示する', () => {
    render(<GameList games={games} categories={categories} />);
    expect(screen.getByText('3 GAMES')).toHaveAttribute('aria-live', 'polite');
    expect(gameLinks()).toEqual(['/game/a', '/game/b', '/game/c']);
    expect(within(screen.getByRole('group', { name: 'カテゴリ' })).getByRole('button', { name: 'ALL' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('検索とカテゴリを AND 条件で組み合わせて絞り込む', async () => {
    const user = userEvent.setup();
    render(<GameList games={games} categories={categories} />);
    await user.type(screen.getByRole('searchbox'), 'パズル');
    expect(gameLinks()).toEqual(['/game/b', '/game/c']);
    await user.click(screen.getByRole('button', { name: 'アクション' }));
    expect(gameLinks()).toEqual(['/game/c']);
    expect(screen.getByText('1 GAMES')).toBeInTheDocument();
  });

  it('0件のときはグリッドの代わりにメッセージを表示する', async () => {
    const user = userEvent.setup();
    render(<GameList games={games} categories={categories} />);
    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(gameLinks()).toEqual([]);
    expect(screen.getByText('0 GAMES')).toBeInTheDocument();
    expect(screen.getByText('NO GAME FOUND — 別のキーワードで探してみてください')).toBeInTheDocument();
  });
});
