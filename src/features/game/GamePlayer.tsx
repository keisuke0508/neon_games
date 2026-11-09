'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { ConfirmModal } from '@/components/ConfirmModal';
import { GameFrame } from '@/components/GameFrame';
import { useLeaveGuard } from '@/contexts/LeaveGuardContext';
import { gameComponents } from '@/games';
import type { Game } from '@/types/game';
import styles from './GamePlayer.module.scss';

export type GamePlayerProps = {
  game: Game;
};

/** ゲームページの本体（docs/design.md §4） */
export function GamePlayer({ game }: GamePlayerProps) {
  const router = useRouter();
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const openConfirm = useCallback(() => setConfirmOpen(true), []);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const leave = useCallback(() => router.push('/'), [router]);

  // ヘッダーのロゴ・フッターの「ゲーム一覧」も ConfirmModal を挟む
  useLeaveGuard(openConfirm);

  const GameComponent = gameComponents[game.id];

  return (
    <div className={styles.wrap} data-page="game">
      <h1 className={styles.title}>{game.title}</h1>

      <GameFrame isPaused={isConfirmOpen}>{GameComponent && <GameComponent />}</GameFrame>

      <p className={styles.rotateHint}>端末を横向きにすると大画面でプレイできます</p>

      <div className={styles.actions}>
        <AppButton variant="danger" onClick={openConfirm}>
          ◀ EXIT ／ TOPに戻る
        </AppButton>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        kicker="QUIT GAME?"
        title="ゲームを終了しますか？"
        onConfirm={leave}
        onCancel={closeConfirm}
      />
    </div>
  );
}
