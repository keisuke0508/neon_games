/**
 * 小僧ランの調整用の定数（docs/games/小僧ラン_design.md §5）。
 * 単位の「フレーム」は 60fps 換算。実際のフレームレートは経過時間（dt）で補正する。
 */

/** canvas の論理解像度 */
export const VIEW = { width: 960, height: 540 } as const;
/** 地面の y */
export const GROUND = 452;

/** 小僧の当たり判定（x は固定） */
export const KID = { x: 330, w: 48, h: 72 } as const;
/** 母ちゃんの大きさ（当たり判定なし） */
export const MOM = { w: 88, h: 112, hopExtra: 26 } as const;

/** 距離の換算（px / m） */
export const PX_PER_M = 40;

/**
 * 難易度（小僧ラン.md「100m 走るごとに難易度が上昇し、1000m で最高難易度」）。
 * レベル = floor(距離m / stepM)（0〜maxLevel）。下の LEVELED の値は、レベル 0 → maxLevel で線形に変わる
 */
export const DIFFICULTY = { stepM: 100, maxLevel: 10 } as const;

/** [レベル0の値, 最高レベルの値] */
export type Range = readonly [number, number];

export const LEVELED = {
  /** 走る速さ(px / フレーム) */
  speed: [15, 17] as Range,
  /** 障害物にぶつかって止まっている間に、母ちゃんとの距離が縮む速さ(px / フレーム)。200 ÷ この値 = つかまるまでのフレーム数 */
  catchRate: [4.1, 5.0] as Range,
  /** 障害物の基本の間隔 = 速さ × gapFactor + ランダム(0〜gapRandom) */
  gapFactor: [33, 24] as Range,
  gapRandom: [280, 140] as Range,
  /** 2つ並びの障害物（COMBO_TEMPLATES）が出る確率（COMBO_FROM_LEVEL 以降） */
  comboChance: [0.275, 0.4] as Range,
  /** 「連続」：次の障害物を、越えられる最短の間隔で出す確率（BURST_FROM_LEVEL 以降） */
  burstChance: [0.25, 0.35] as Range,
} as const;

export const COMBO_FROM_LEVEL = 0;
export const BURST_FROM_LEVEL = 0;

/**
 * ジャンプ。押した瞬間に velocity で跳び、押している間（最大 maxHoldFrames）は重力が holdGravity に弱まる。
 * 一瞬のタップで約 80px、0.05秒（3フレーム）で約 115px、上限（0.15秒）まで押すと約 187px 跳ぶ
 */
export const JUMP = { velocity: -12, gravity: 0.85, holdGravity: 0, maxHoldFrames: 9 } as const;

/** 障害物の種類。minLevel 以降に出現する（docs/games/小僧ラン_design.md §4） */
export const OBSTACLE_TYPES = {
  small: { w: 48, h: 48, minLevel: 0 }, // 植木鉢
  tall: { w: 44, h: 84, minLevel: 0 }, // ポリバケツ
  wide: { w: 96, h: 44, minLevel: 0 }, // 昼寝中の猫
  bench: { w: 150, h: 34, minLevel: 0 }, // 縁台（長め）
  crates: { w: 52, h: 120, minLevel: 0 }, // ビールケースの山（高め）
  bicycle: { w: 112, h: 72, minLevel: 2 }, // 自転車（長めで高め）
} as const;

export type ObstacleType = keyof typeof OBSTACLE_TYPES;

/** 2つ並びの障害物。dx は先頭の障害物の左端からの位置(px) */
export const COMBO_TEMPLATES: readonly { id: string; minLevel: number; parts: readonly [ObstacleType, number][] }[] = [
  { id: 'small+small', minLevel: 0, parts: [['small', 0], ['small', 110]] },
  { id: 'wide+small', minLevel: 0, parts: [['wide', 0], ['small', 150]] },
  { id: 'small+tall', minLevel: 0, parts: [['small', 0], ['tall', 120]] },
  { id: 'tall+tall', minLevel: 4, parts: [['tall', 0], ['tall', 110]] },
  { id: 'small+crates', minLevel: 6, parts: [['small', 0], ['crates', 120]] },
];

/** 障害物の出現 */
export const SPAWN = {
  /** 最初の障害物までの距離(px) */
  first: 700,
  /** 出現位置の x */
  x: VIEW.width + 20,
  /** 画面左外のこの位置を過ぎたら消す */
  despawnX: -200,
} as const;

/**
 * 「絶対に越えられない障害物」を出さないための検証（course.ts）。
 * 障害物の並びごとに、実際のジャンプの物理でシミュレーションし、人が押せる幅のタイミングで越えられるものだけを出す
 */
export const FAIRNESS = {
  /** 検証時に障害物を大きめに扱う余裕(px)。フレームレートの違いによる誤差を吸収する */
  marginW: 12,
  marginH: 8,
  /** 越えられるタイミングが、最低この連続フレーム数だけ続くこと（約 100ms） */
  windowFrames: 6,
  /** 人が押せる最短の長さ(フレーム、約 50ms)。これより長い押し方だけで検証する */
  minHoldFrames: 3,
  holdStep: 1,
  /** 障害物の並び同士の間に、検証結果に加えて空ける余裕(px) */
  gapMargin: 24,
} as const;

/** 母ちゃんとの距離（px） */
export const GAP = {
  max: 200,
  /** 走れている間に広がる速さ(px / フレーム) */
  recoverRate: 0.35,
} as const;

/** 1フレームあたりの経過時間補正の上限 */
export const MAX_DT = 2.5;

/** 演出 */
export const FX = {
  /** 母ちゃんが「まちなさーい！」と言い出す危険度 */
  bubbleDanger: 0.45,
  /** つかまってから ResultModal を開くまで(ms) */
  resultDelayMs: 650,
} as const;
