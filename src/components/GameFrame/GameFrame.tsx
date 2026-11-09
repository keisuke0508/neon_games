'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import styles from './GameFrame.module.scss';

export type GameFrameState = {
  /** ConfirmModal などを表示中で、ゲームを一時停止すべきとき true */
  isPaused: boolean;
};

const GameFrameContext = createContext<GameFrameState>({ isPaused: false });

/** GameFrame の中で描画されるゲームが、枠の状態（一時停止中か）を受け取る */
export function useGameFrame(): GameFrameState {
  return useContext(GameFrameContext);
}

export type GameFrameProps = {
  children?: ReactNode;
  isPaused?: boolean;
};

/**
 * ゲームを表示する 16:9 の枠（docs/design.md §5 GameFrame）。
 * children は枠いっぱい（position: absolute; inset: 0 相当）に描画する前提。
 */
export function GameFrame({ children, isPaused = false }: GameFrameProps) {
  const value = useMemo(() => ({ isPaused }), [isPaused]);
  return (
    <div className={styles.frame} data-paused={isPaused || undefined}>
      <GameFrameContext.Provider value={value}>{children}</GameFrameContext.Provider>
    </div>
  );
}
