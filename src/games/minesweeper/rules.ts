/**
 * マインスイーパの数値（design/games/マインスイーパ.md §5）。
 * 盤面の大きさと爆弾の数は PM 確認中の暫定値（同 §7-1）。
 */

export type LevelKey = 'easy' | 'normal' | 'hard';

export type Level = {
  key: LevelKey;
  name: string;
  cols: number;
  rows: number;
  mines: number;
};

export const LEVELS: Record<LevelKey, Level> = {
  easy: { key: 'easy', name: 'かんたん', cols: 10, rows: 6, mines: 8 },
  normal: { key: 'normal', name: 'ふつう', cols: 14, rows: 8, mines: 18 },
  hard: { key: 'hard', name: 'むずかしい', cols: 18, rows: 10, mines: 35 },
};

/** 難易度選択の並び（上から かんたん・ふつう・むずかしい） */
export const LEVEL_ORDER: readonly LevelKey[] = ['easy', 'normal', 'hard'];

/** 演出の時間(ms)（同 §3-7, §3-8） */
export const TIMING = {
  /** 0 のマスが連鎖して開くとき、1マス進むごとの遅れ */
  openStep: 28,
  /** 1マスが開く動き */
  open: 180,
  /** 旗が落ちてくる動き */
  flag: 300,
  /** クリア：告知を出すまで */
  beforeClearBanner: 500,
  /** ゲームオーバー：残りの爆弾を出し始めるまで（盤面の揺れ） */
  shake: 450,
  /** ゲームオーバー：残りの爆弾を1つずつずらす間隔 */
  revealStep: 40,
  /** ゲームオーバー：爆弾を出し終えてから告知まで */
  beforeBoomBanner: 400,
  banner: 1300,
} as const;
