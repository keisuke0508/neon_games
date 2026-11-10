import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * ゲーム id → ゲーム本体コンポーネントの対応表。
 * 各ゲームは GameFrame の中に枠いっぱい（position: absolute; inset: 0）で描画する前提。
 * モーダル表示中かどうかは useGameFrame() で受け取れる。
 * ゲームごとにコードを分割して読み込む。
 */
export const gameComponents: Record<string, ComponentType> = {
  '1': dynamic(() => import('./kozo-run/KozoRun')),
  '2': dynamic(() => import('./poker/Poker')),
};
