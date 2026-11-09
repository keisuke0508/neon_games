import type { Game } from '@/types/game';

export const games: Game[] = [
  {
    // docs/games/小僧ラン.md
    id: '1',
    title: '小僧ラン 〜迫り来る母ちゃんの恐怖〜',
    image: '/images/games/kozo-run.png',
    categoryIds: ['action'],
  },
];

export function getGameById(id: string): Game | undefined {
  return games.find((game) => game.id === id);
}
