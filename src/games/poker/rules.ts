/**
 * 1vs1 ポーカーのルールと演出の数値（design/games/ポーカー.md §5）。
 * 「仮」は PM 確認中の暫定値（同 §7 未決事項）。
 */

/** 最初のコイン（仕様書） */
export const START_COINS = 5000;
/** 回戦数（仕様書） */
export const ROUNDS = 10;
/** 参加費。毎回、配る前に両者から（仮 §7-1） */
export const ANTE = 100;
/** 最低ベット・最低レイズ（仮 §7-2） */
export const MIN_BET = 100;
/** 1回の賭けでのレイズ回数の上限（仮 §7-3） */
export const MAX_RAISES = 2;
/** 手札の枚数 */
export const HAND_SIZE = 5;
/** 賭け金パネルに入力できる最大の数 */
export const BET_INPUT_MAX = 99_999;

/** 演出の待ち時間(ms)（同 §3） */
export const TIMING = {
  /** 親決めで「親」バッジが移る間隔（i は0から数えた回数） */
  dealerStep: (i: number) => 70 + i * i * 2.2,
  dealerSteps: 12,
  dealerBanner: 1200,
  roundBanner: 1000,
  /** 配り終えるまで */
  deal: 900,
  /** 1枚ごとに配るのをずらす */
  dealStagger: 90,
  phaseBanner: 950,
  /** CPU の考え中（min〜min+range のランダム） */
  cpuThinkMin: 700,
  cpuThinkRange: 500,
  /** CPU が行動してから次の人の番まで */
  afterCpu: 600,
  /** 交換するカードが消えるまで */
  leave: 300,
  /** あなたの交換のあと、CPU が交換するまで */
  afterExchange: 700,
  /** CPU の交換のあと */
  afterCpuExchange: 900,
  /** ショーダウン：CPU のカードを裏返す間隔 */
  flipStagger: 120,
  revealWait: 900,
  beforeSettle: 500,
  settleBanner: 1300,
  /** 「次のゲームへ」を押さなくても進むまで */
  autoNext: 4000,
  /** 最後の回戦のあと、結果へ進むまで */
  lastWait: 1200,
  finalBanner: 1800,
} as const;
