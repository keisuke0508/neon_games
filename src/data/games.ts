import type { Game } from '@/types/game';

export const games: Game[] = [
  {
    // docs/games/小僧ラン.md
    id: '1',
    title: '小僧ラン 〜迫り来る母ちゃんの恐怖〜',
    image: '/images/games/kozo-run.png',
    categoryIds: ['action'],
  },
  {
    // docs/games/ポーカー.md
    id: '2',
    title: '1vs1 ポーカー',
    image: '/images/games/poker.png',
    categoryIds: ['table'],
  },
  {
    // docs/games/マインスイーパ.md
    id: '3',
    title: 'マインスイーパ',
    image: '/images/games/minesweeper.png',
    categoryIds: ['puzzle'],
  },
];

export function getGameById(id: string): Game | undefined {
  return games.find((game) => game.id === id);
}
