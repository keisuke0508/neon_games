import { render, screen } from '@testing-library/react';
import type { Category, Game } from '@/types/game';
import { GameItem } from './GameItem';

const categories: Category[] = [
  { id: 'puzzle', categoryName: 'パズル' },
  { id: 'brain', categoryName: '脳トレ' },
];

const game: Game = { id: 'slide', title: '15パズル', image: '/images/games/slide.png', categoryIds: ['puzzle', 'brain'] };

describe('GameItem', () => {
  it('ゲームページへのリンクとして、ゲーム名とカテゴリのタグを表示する', () => {
    render(<GameItem game={game} categories={categories} />);
    const link = screen.getByRole('link', { name: /15パズル/ });
    expect(link).toHaveAttribute('href', '/game/slide');
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['パズル', '脳トレ']);
  });

  it('画像は装飾として alt="" で表示する', () => {
    const { container } = render(<GameItem game={game} categories={categories} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
  });

  it('画像がないときは img を描画しない', () => {
    const { container } = render(<GameItem game={{ ...game, image: '' }} categories={categories} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('存在しないカテゴリ id はタグにしない', () => {
    render(<GameItem game={{ ...game, categoryIds: ['unknown'] }} categories={categories} />);
    expect(screen.queryByRole('list')).toBeNull();
  });
});
