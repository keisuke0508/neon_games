import {
  BURST_FROM_LEVEL,
  COMBO_FROM_LEVEL,
  DIFFICULTY,
  GAP,
  KID,
  LEVELED,
  MOM,
  PX_PER_M,
  SPAWN,
  type Range,
} from './constants';
import { COMBOS, SINGLE_TEMPLATES, planFor, safeGap, type Plan, type Template } from './course';
import { createKid, makeObstacle, pressJump, releaseJump, stepBody, type Body } from './physics';

/**
 * 小僧ランのルールと状態遷移（描画と DOM には依存しない）。
 * 状態は step() で直接書き換える。
 */

export type { Obstacle, KidState } from './physics';

/** 画面に出ている障害物の並び */
export type Cluster = {
  /** 先頭の左端の x */
  x: number;
  span: number;
  /** 越えるための操作（出現時に想定した速さごと） */
  plans: Plan[];
};

type Upcoming = { template: Template; plans: Plan[] };

export type GameState = Body & {
  /** スタート画面の背景デモ（レベル0固定・つかまらない・自動でジャンプ） */
  demo: boolean;
  /** 経過フレーム（60fps 換算） */
  t: number;
  /** 走った距離(px) */
  dist: number;
  /** 母ちゃんとの距離(px) */
  gap: number;
  /** 母ちゃんが障害物を跳び越える高さ（演出） */
  momHop: number;
  clusters: Cluster[];
  /** 次の並びが出るまでの距離(px) */
  nextObstacle: number;
  /** 次に出す並び（間隔の計算のため、1つ先まで決めておく） */
  upcoming: Upcoming | null;
  caught: boolean;
};

export type Random = () => number;

/** 走った距離(m) */
export function metersOf(state: Pick<GameState, 'dist'>): number {
  return Math.floor(state.dist / PX_PER_M);
}

/** 難易度レベル（0〜maxLevel）。100m ごとに 1 上がる */
export function levelAt(meters: number): number {
  return Math.min(DIFFICULTY.maxLevel, Math.floor(meters / DIFFICULTY.stepM));
}

/** レベルに応じた値（レベル0 → 最高レベルで線形） */
export function leveled([from, to]: Range, level: number): number {
  return from + ((to - from) * level) / DIFFICULTY.maxLevel;
}

export function levelOf(state: GameState): number {
  return state.demo ? 0 : levelAt(metersOf(state));
}

/** 走る速さ(px / フレーム) */
export function speedAt(meters: number): number {
  return leveled(LEVELED.speed, levelAt(meters));
}

/** 危険度（0: 最大距離 〜 1: つかまる） */
export function dangerOf(state: GameState): number {
  return 1 - state.gap / GAP.max;
}

export function createState(demo: boolean): GameState {
  return {
    demo,
    t: 0,
    dist: 0,
    speed: leveled(LEVELED.speed, 0),
    gap: GAP.max,
    kid: createKid(),
    momHop: 0,
    obstacles: [],
    clusters: [],
    nextObstacle: SPAWN.first,
    upcoming: null,
    caught: false,
  };
}

/** ジャンプのボタンを押す。跳んだら true */
export function jump(state: GameState): boolean {
  if (state.caught) return false;
  return pressJump(state.kid);
}

/** ジャンプのボタンを離す */
export function release(state: GameState): void {
  releaseJump(state.kid);
}

// ---------- 障害物の出現 ----------

/** 並びが出てから越えるまでの間に、レベルが1つ上がることがあるので、両方の速さで検証する */
function speedsFor(level: number, demo: boolean): number[] {
  const now = leveled(LEVELED.speed, level);
  if (demo || level >= DIFFICULTY.maxLevel) return [now];
  return [now, leveled(LEVELED.speed, level + 1)];
}

/** 両方の速さで越えられることを検証した並びだけを候補にする */
function plansFor(template: Template, speeds: number[]): Plan[] | null {
  const plans: Plan[] = [];
  for (const speed of speeds) {
    const plan = planFor(template, speed);
    if (!plan) return null;
    plans.push(plan);
  }
  return plans;
}

/** そのレベルで使う並びの検証を、先に済ませておく（ゲーム中の処理落ちを防ぐ） */
export function prepareLevel(level: number): void {
  const speeds = speedsFor(level, false);
  for (const template of [...SINGLE_TEMPLATES, ...COMBOS]) {
    if (template.minLevel <= level) plansFor(template, speeds);
  }
}

function pick<T>(list: readonly T[], random: Random): T {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

/** 次の並びを選ぶ */
export function chooseUpcoming(level: number, demo: boolean, random: Random): Upcoming {
  const speeds = speedsFor(level, demo);
  const usable = (list: Template[]) =>
    list
      .filter((t) => t.minLevel <= level)
      .map((template) => ({ template, plans: plansFor(template, speeds) }))
      .filter((u): u is Upcoming => u.plans !== null);

  const combos = level >= COMBO_FROM_LEVEL ? usable(COMBOS) : [];
  if (combos.length > 0 && random() < leveled(LEVELED.comboChance, level)) return pick(combos, random);
  return pick(usable(SINGLE_TEMPLATES), random);
}

function spawnCluster(state: GameState, random: Random): void {
  const level = levelOf(state);
  const current = state.upcoming ?? chooseUpcoming(level, state.demo, random);
  const { template, plans } = current;
  for (const p of template.parts) state.obstacles.push(makeObstacle(p.type, SPAWN.x + p.dx));
  state.clusters.push({ x: SPAWN.x, span: template.span, plans });

  const next = chooseUpcoming(level, state.demo, random);
  state.upcoming = next;

  // 基本の間隔（レベルが上がるほど狭い）。「連続」のときは、越えられる最短の間隔にする
  let base = state.speed * leveled(LEVELED.gapFactor, level) + random() * leveled(LEVELED.gapRandom, level);
  if (level >= BURST_FROM_LEVEL && random() < leveled(LEVELED.burstChance, level)) base = 0;
  // どんな場合も、A を越えて着地してから B を越えられる間隔は必ず空ける
  state.nextObstacle = template.span + Math.max(base, safeGap(plans, next.plans));
}

// ---------- 自動操縦（デモ） ----------

/** 次の並びを、検証済みの操作どおりに越える */
export function autopilot(state: GameState): void {
  const kid = state.kid;
  if (!kid.grounded) return;
  const kidR = KID.x + KID.w;
  const next = state.clusters.find((c) => c.x + c.span > KID.x);
  if (!next || next.x < kidR) return;
  const plan = next.plans.find((p) => p.speed === state.speed) ?? next.plans[0];
  if (next.x - kidR <= plan.pressLead) pressJump(kid, plan.hold);
}

// ---------- 1ステップ ----------

/**
 * dt フレームぶん進める。
 * @returns この step でつかまったら true
 */
export function step(state: GameState, dt: number, random: Random = Math.random): boolean {
  if (state.caught) return false;
  state.t += dt;
  const level = levelOf(state);
  // 速さは地面にいるときだけ変える（ジャンプ中に変わると、検証した軌道とずれるため）
  if (state.kid.grounded) state.speed = leveled(LEVELED.speed, level);

  const scroll = stepBody(state, dt);
  for (const c of state.clusters) c.x -= scroll;
  state.clusters = state.clusters.filter((c) => c.x + c.span > SPAWN.despawnX);
  state.dist += scroll;
  state.nextObstacle -= scroll;
  if (state.nextObstacle <= 0) spawnCluster(state, random);

  // 母ちゃん：止まると迫り（レベルが上がるほど速く）、走れていると少し離れる
  if (!state.demo) {
    const delta = state.kid.blocked ? -leveled(LEVELED.catchRate, level) : GAP.recoverRate;
    state.gap = Math.min(GAP.max, state.gap + delta * dt);
  }

  // 母ちゃんの足元を通る障害物は跳び越える（演出）
  const momL = KID.x - state.gap - MOM.w;
  state.momHop = 0;
  for (const o of state.obstacles) {
    const p = (momL + MOM.w + 30 - o.x) / (MOM.w + o.w + 60);
    if (p > 0 && p < 1) state.momHop = Math.max(state.momHop, Math.sin(p * Math.PI) * (o.h + MOM.hopExtra));
  }

  if (state.demo) autopilot(state);

  if (!state.demo && state.gap <= 0) {
    state.gap = 0;
    state.caught = true;
    return true;
  }
  return false;
}
