import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { games, getGameById } from '@/data/games';
import { GamePlayer } from '@/features/game/GamePlayer';

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return games.map((game) => ({ id: game.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const game = getGameById(id);
  return { title: game ? game.title : 'GAME NOT FOUND' };
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const game = getGameById(id);
  if (!game) notFound();

  return (
    <div className="container">
      <GamePlayer game={game} />
    </div>
  );
}
