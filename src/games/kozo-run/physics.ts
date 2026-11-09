import { GROUND, JUMP, KID, OBSTACLE_TYPES, SPAWN, type ObstacleType } from './constants';

/**
 * 小僧と障害物の物理（走る・跳ぶ・ぶつかる・着地する）。
 * ゲーム本体（engine.ts）と、障害物が越えられるかの検証（course.ts）で同じ処理を使う。
 */

export type Obstacle = {
  type: ObstacleType;
  /** 左端の x */
  x: number;
  w: number;
  h: number;
};

export type KidState = {
  y: number;
  vy: number;
  grounded: boolean;
  /** 障害物の側面にぶつかって止まっている */
  blocked: boolean;
  /** ジャンプのボタンを押し続けている（上昇中だけ意味を持つ） */
  holding: boolean;
  /** ジャンプのボタンを押してからの時間(フレーム) */
  holdTime: number;
  /** この時間(フレーム)押したら自動で離す（デモと検証用） */
  autoRelease: number | null;
  /** 走りアニメーション用の距離 */
  run: number;
};

export type Body = {
  kid: KidState;
  obstacles: Obstacle[];
  /** 走る速さ(px / フレーム) */
  speed: number;
};

export function createKid(): KidState {
  return {
    y: GROUND - KID.h,
    vy: 0,
    grounded: true,
    blocked: false,
    holding: false,
    holdTime: 0,
    autoRelease: null,
    run: 0,
  };
}

export function makeObstacle(type: ObstacleType, x: number): Obstacle {
  const { w, h } = OBSTACLE_TYPES[type];
  return { type, x, w, h };
}

/** ジャンプのボタンを押す。地面か障害物の上に立っているときだけ跳ぶ（2段ジャンプ不可）。跳んだら true */
export function pressJump(kid: KidState, autoRelease: number | null = null): boolean {
  if (!kid.grounded) return false;
  kid.vy = JUMP.velocity;
  kid.grounded = false;
  kid.holding = true;
  kid.holdTime = 0;
  kid.autoRelease = autoRelease;
  return true;
}

/** ジャンプのボタンを離す */
export function releaseJump(kid: KidState): void {
  kid.holding = false;
}

/**
 * dt フレームぶん進める。
 * @returns 横にスクロールした距離(px)。側面にぶつかっている間は 0
 */
export function stepBody(body: Body, dt: number): number {
  const { kid } = body;
  const kidL = KID.x;
  const kidR = KID.x + KID.w;

  // 横方向：障害物の側面に当たっていたらスクロールを止める
  const bottom = kid.y + KID.h;
  let scroll = body.speed * dt;
  kid.blocked = false;
  for (const o of body.obstacles) {
    const top = GROUND - o.h;
    if (bottom > top + 2 && o.x >= kidR - 8 && o.x - scroll < kidR) {
      scroll = Math.max(0, o.x - kidR);
      kid.blocked = scroll === 0;
    }
  }
  for (const o of body.obstacles) o.x -= scroll;
  body.obstacles = body.obstacles.filter((o) => o.x + o.w > SPAWN.despawnX);

  // 縦方向：押している間（上昇中・上限まで）は重力が弱まる
  if (kid.holding) {
    const limit = Math.min(JUMP.maxHoldFrames, kid.autoRelease ?? Infinity);
    if (kid.holdTime >= limit || kid.vy >= 0) kid.holding = false;
  }
  const holdDt = kid.holding ? Math.min(dt, Math.min(JUMP.maxHoldFrames, kid.autoRelease ?? Infinity) - kid.holdTime) : 0;
  kid.vy += JUMP.holdGravity * holdDt + JUMP.gravity * (dt - holdDt);
  kid.holdTime += dt;

  const prevBottom = kid.y + KID.h;
  kid.y += kid.vy * dt;
  let support = GROUND;
  for (const o of body.obstacles) {
    const top = GROUND - o.h;
    if (o.x < kidR && o.x + o.w > kidL && prevBottom <= top + 1) support = Math.min(support, top);
  }
  if (kid.y + KID.h >= support) {
    kid.y = support - KID.h;
    kid.vy = 0;
    kid.grounded = true;
    kid.holding = false;
  } else {
    kid.grounded = false;
  }
  if (!kid.blocked && kid.grounded) kid.run += scroll;
  return scroll;
}
