import {
  COMBO_TEMPLATES,
  FAIRNESS,
  GROUND,
  JUMP,
  KID,
  OBSTACLE_TYPES,
  SPAWN,
  type ObstacleType,
} from './constants';
import { createKid, makeObstacle, pressJump, stepBody, type Body } from './physics';

/**
 * 障害物の並び（テンプレート）と、それが「越えられるか」の検証。
 *
 * 並びごとに、実際のジャンプの物理（physics.ts）で
 * 「押すタイミング × 押す長さ」を総当たりでシミュレーションし、
 * 1回のジャンプで、側面にぶつからずに越えられるタイミングが
 * FAIRNESS.windowFrames フレーム以上続くものだけを「越えられる」とする。
 * 越えられない並びは出現させない。
 */

export type Template = {
  id: string;
  minLevel: number;
  parts: readonly { type: ObstacleType; dx: number }[];
  /** 先頭の左端から末尾の右端までの長さ(px) */
  span: number;
};

/** 並びを越えるための操作 */
export type Plan = {
  /** この速さで検証した */
  speed: number;
  /** 押す長さ(フレーム) */
  hold: number;
  /** 越えられるタイミングの範囲。小僧の右端から並びの先頭までの距離(px)が [minLead, maxLead] のときに押せば越えられる */
  minLead: number;
  maxLead: number;
  /** 自動操縦（デモ）が押す位置：範囲の真ん中 */
  pressLead: number;
  /** 範囲のどこで押しても、着地したとき小僧の右端は並びの末尾から最大 exit(px) 先にいる */
  exit: number;
};

function toTemplate(id: string, minLevel: number, parts: readonly [ObstacleType, number][]): Template {
  const list = parts.map(([type, dx]) => ({ type, dx }));
  const span = Math.max(...list.map((p) => p.dx + OBSTACLE_TYPES[p.type].w));
  return { id, minLevel, parts: list, span };
}

export const SINGLE_TEMPLATES: Template[] = (Object.keys(OBSTACLE_TYPES) as ObstacleType[]).map((type) =>
  toTemplate(type, OBSTACLE_TYPES[type].minLevel, [[type, 0]]),
);

export const COMBOS: Template[] = COMBO_TEMPLATES.map((c) => toTemplate(c.id, c.minLevel, c.parts));

/** 押すのは、並びが画面に見えてから（出現位置より手前） */
const MAX_LEAD = SPAWN.x - (KID.x + KID.w) - FAIRNESS.marginW;

type Trial = { ok: false } | { ok: true; exit: number };

/** 先頭まで lead(px) の位置で押し、hold フレーム押し続けたときに越えられるか */
export function tryJump(template: Template, speed: number, lead: number, hold: number): Trial {
  const kidR = KID.x + KID.w;
  const half = FAIRNESS.marginW / 2;
  const body: Body = {
    kid: createKid(),
    speed,
    // 余裕を持たせるため、障害物を少し大きく扱う
    obstacles: template.parts.map((p) => {
      const o = makeObstacle(p.type, kidR + lead + p.dx - half);
      return { ...o, w: o.w + FAIRNESS.marginW, h: o.h + FAIRNESS.marginH };
    }),
  };
  pressJump(body.kid, hold);

  const end = lead + template.span; // 押した時点の、小僧の右端から並びの末尾までの距離
  let traveled = 0;
  for (let frame = 0; frame < 600; frame++) {
    traveled += stepBody(body, 1);
    if (body.kid.blocked) return { ok: false };
    const onGround = body.kid.grounded && body.kid.y === GROUND - KID.h;
    if (onGround) {
      // 地面に下りた時点で、並びをすべて越えていれば成功（越える前に下りたら、もう1回跳ぶ必要があるので失敗）
      const passed = body.obstacles.every((o) => o.x + o.w <= KID.x);
      return passed ? { ok: true, exit: traveled - end + half } : { ok: false };
    }
  }
  return { ok: false };
}

/** 押す長さの候補（人が押せる最短から上限まで） */
export function holdCandidates(): number[] {
  const list: number[] = [];
  for (let h = FAIRNESS.minHoldFrames; h <= JUMP.maxHoldFrames; h += FAIRNESS.holdStep) list.push(h);
  return list;
}

/**
 * 並びを、この速さで越えられるか検証する。越えられなければ null。
 * 越えられる操作のうち、「必要な助走（maxLead）＋着地までの距離（exit）」が最小のものを返す
 */
export function analyze(template: Template, speed: number): Plan | null {
  let best: Plan | null = null;
  const count = Math.floor(MAX_LEAD / speed);
  for (const hold of holdCandidates()) {
    // 1フレーム早く押す = lead が speed だけ大きい
    const trials = Array.from({ length: count + 1 }, (_, i) => tryJump(template, speed, i * speed, hold));
    // 連続 windowFrames フレームの範囲（人が押せる幅）をずらしながら、最も短く越えられる範囲を探す
    const w = FAIRNESS.windowFrames;
    for (let i = 0; i + w <= trials.length; i++) {
      const window = trials.slice(i, i + w);
      if (!window.every((t) => t.ok)) continue;
      const j = i + w - 1;
      const plan: Plan = {
        speed,
        hold,
        minLead: i * speed,
        maxLead: j * speed,
        pressLead: Math.round((i + j) / 2) * speed,
        exit: Math.max(...window.map((t) => (t.ok ? t.exit : Infinity))),
      };
      if (!best || plan.maxLead + plan.exit < best.maxLead + best.exit) best = plan;
    }
  }
  return best;
}

const cache = new Map<string, Plan | null>();

/** analyze() の結果をキャッシュして返す */
export function planFor(template: Template, speed: number): Plan | null {
  const key = `${template.id}@${speed}`;
  if (!cache.has(key)) cache.set(key, analyze(template, speed));
  return cache.get(key) ?? null;
}

/**
 * 並び A の後に並び B を置くとき、A の末尾から B の先頭までに必要な最短の間隔(px)。
 * A を越えて着地してから、B を越えるタイミングの範囲が始まる前に、地面を走っていられる
 */
export function safeGap(a: readonly Plan[], b: readonly Plan[]): number {
  const exit = Math.max(...a.map((p) => p.exit));
  const lead = Math.max(...b.map((p) => p.maxLead));
  return Math.max(0, exit + lead + FAIRNESS.gapMargin);
}
