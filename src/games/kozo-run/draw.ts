import { FX, GROUND, KID, MOM, VIEW } from './constants';
import { dangerOf, type GameState, type Obstacle } from './engine';

/**
 * 小僧ランの canvas 描画（docs/games/小僧ラン_design.md §3, §4）。
 * 座標は論理解像度 960×540。すべて ink のふち取り＋フラットな塗り。
 */

type Ctx = CanvasRenderingContext2D;

const C = {
  ink: '#2B1B24',
  red: '#E8473B',
  skin: '#F6C9A0',
} as const;

export type DrawOptions = {
  /** つかまった後（「つかまえた！」「ひぃ〜」を出す） */
  caught: boolean;
  /** canvas に文字を描くフォント（Mochiy Pop One の font-family） */
  fontFamily: string;
};

/** 位置（インデックス）から決まる疑似乱数。毎フレーム同じ値を返す */
export const rnd = (i: number, seed: number): number => {
  const r = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return r - Math.floor(r);
};

function shape(ctx: Ctx, fill: string, path: () => void, lineWidth = 3): void {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = C.ink;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** 手足：ink の太い線の上に肌色の細い線を重ねる */
function limb(ctx: Ctx, pts: [number, number][], color: string, width: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => ctx.lineTo(...p));
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = width + 5;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function bubble(ctx: Ctx, x: number, y: number, text: string, fontFamily: string): void {
  ctx.font = `22px ${fontFamily}`;
  const w = ctx.measureText(text).width + 30;
  shape(ctx, '#fff', () => {
    ctx.roundRect(x, y - 40, w, 40, 20);
    ctx.moveTo(x + 18, y - 2);
    ctx.lineTo(x + 6, y + 14);
    ctx.lineTo(x + 32, y - 2);
  });
  ctx.fillStyle = C.red;
  ctx.fillText(text, x + 15, y - 12);
}

// ---------- 背景 ----------
function drawBackground(ctx: Ctx, cam: number): void {
  const W = VIEW.width;
  const H = VIEW.height;

  // 空と夕日
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#5B4B9A');
  sky.addColorStop(0.45, '#E8708A');
  sky.addColorStop(0.8, '#FFB067');
  sky.addColorStop(1, '#FFD98A');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND);
  ctx.fillStyle = '#FFF0C2';
  ctx.beginPath();
  ctx.arc(720, 250, 70, 0, Math.PI * 2);
  ctx.fill();

  // カラス（0.05）
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const bx = W + 200 - ((cam * 0.05 + i * 260) % (W + 300));
    const by = 90 + i * 34;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 9, by - 9, bx + 18, by);
    ctx.quadraticCurveTo(bx + 27, by - 9, bx + 36, by);
    ctx.stroke();
  }

  // 遠くの家並み（0.15）
  const off1 = cam * 0.15;
  const first1 = Math.floor(off1 / 120) - 1;
  for (let i = first1; i < first1 + W / 120 + 3; i++) {
    const x = i * 120 - off1;
    const h = 70 + rnd(i, 3) * 60;
    const top = GROUND - 120 - h;
    ctx.fillStyle = '#8A4E73';
    ctx.beginPath();
    ctx.moveTo(x - 4, top + 26);
    ctx.lineTo(x + 56, top);
    ctx.lineTo(x + 116, top + 26);
    ctx.lineTo(x + 116, GROUND);
    ctx.lineTo(x - 4, GROUND);
    ctx.fill();
    if (rnd(i, 4) > 0.4) {
      ctx.fillStyle = '#FFD27A';
      ctx.fillRect(x + 30, top + 46, 16, 14);
      ctx.fillRect(x + 66, top + 46, 16, 14);
    }
  }

  // 電柱と電線（0.5）
  const off2 = cam * 0.5;
  const sp = 380;
  const first2 = Math.floor(off2 / sp) - 1;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  for (let i = first2; i < first2 + W / sp + 3; i++) {
    const x = i * sp - off2;
    for (const dy of [0, 14]) {
      ctx.beginPath();
      ctx.moveTo(x + 8, 70 + dy);
      ctx.quadraticCurveTo(x + sp / 2, 130 + dy, x + sp + 8, 70 + dy);
      ctx.stroke();
    }
    ctx.fillStyle = '#4A2E3C';
    ctx.fillRect(x, 50, 16, GROUND - 50);
    ctx.fillRect(x - 14, 66, 44, 6);
  }

  // ブロック塀（1.0）
  const wallTop = GROUND - 120;
  ctx.fillStyle = '#C9B3A6';
  ctx.fillRect(0, wallTop, W, GROUND - wallTop);
  ctx.strokeStyle = 'rgba(43,27,36,.35)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 6; r++) {
    const y = wallTop + r * 20;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    const shift = (r % 2) * 40;
    for (let bx = -((cam + shift) % 80); bx < W; bx += 80) {
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx, y + 20);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#A88F84';
  ctx.fillRect(0, wallTop - 10, W, 12);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(-4, wallTop - 10, W + 8, 12);

  // 道路（1.0）
  ctx.fillStyle = '#7A6670';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, GROUND, W, 4);
  ctx.fillStyle = '#F4E9D8';
  for (let lx = -(cam % 140); lx < W; lx += 140) ctx.fillRect(lx, GROUND + 46, 70, 6);
}

// ---------- 障害物 ----------
function drawObstacle(ctx: Ctx, o: Obstacle, t: number, fontFamily: string): void {
  const { x, w, h } = o;
  const y = GROUND - h;
  if (o.type === 'small') {
    // 植木鉢
    shape(ctx, '#5BAA4A', () => ctx.ellipse(x + w / 2, y + 12, 18, 14, 0, 0, Math.PI * 2));
    shape(ctx, C.red, () => ctx.arc(x + w / 2 + 8, y + 6, 6, 0, Math.PI * 2));
    shape(ctx, '#C8643A', () => {
      ctx.moveTo(x + 4, y + 20);
      ctx.lineTo(x + w - 4, y + 20);
      ctx.lineTo(x + w - 10, y + h);
      ctx.lineTo(x + 10, y + h);
      ctx.closePath();
    });
    shape(ctx, '#D97A4E', () => ctx.rect(x + 2, y + 18, w - 4, 8));
  } else if (o.type === 'tall') {
    // ポリバケツ
    shape(ctx, '#3D7DCA', () => {
      ctx.moveTo(x + 4, y + 12);
      ctx.lineTo(x + w - 4, y + 12);
      ctx.lineTo(x + w - 7, y + h);
      ctx.lineTo(x + 7, y + h);
      ctx.closePath();
    });
    shape(ctx, '#5A97E0', () => ctx.roundRect(x, y + 4, w, 12, 4));
    shape(ctx, '#5A97E0', () => ctx.roundRect(x + w / 2 - 8, y - 2, 16, 8, 3));
    ctx.strokeStyle = 'rgba(43,27,36,.4)';
    ctx.lineWidth = 2;
    for (const dy of [32, 52]) {
      ctx.beginPath();
      ctx.moveTo(x + 6, y + dy);
      ctx.lineTo(x + w - 6, y + dy);
      ctx.stroke();
    }
  } else if (o.type === 'bench') {
    // 縁台（長め）
    ctx.fillStyle = '#8F5E36';
    ctx.fillRect(x + 12, y + 22, w - 24, 5);
    shape(ctx, '#9C6A3F', () => ctx.rect(x + 10, y + 10, 10, h - 10));
    shape(ctx, '#9C6A3F', () => ctx.rect(x + w - 20, y + 10, 10, h - 10));
    shape(ctx, '#C48A55', () => ctx.roundRect(x, y, w, 12, 3));
    ctx.strokeStyle = 'rgba(43,27,36,.35)';
    ctx.lineWidth = 2;
    for (let sx = x + 30; sx < x + w - 10; sx += 30) {
      ctx.beginPath();
      ctx.moveTo(sx, y + 2);
      ctx.lineTo(sx, y + 10);
      ctx.stroke();
    }
    // うちわ
    shape(ctx, '#7CC6F2', () => ctx.ellipse(x + 44, y - 7, 11, 8, -0.3, 0, Math.PI * 2), 2.5);
  } else if (o.type === 'crates') {
    // ビールケースの山（高め）
    const n = 3;
    const ch = h / n;
    for (let i = 0; i < n; i++) {
      const cy = y + h - ch * (i + 1);
      shape(ctx, i % 2 === 0 ? C.red : '#FFC93C', () => ctx.roundRect(x, cy, w, ch, 4));
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.roundRect(x + w / 2 - 10, cy + 7, 20, 7, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(43,27,36,.35)';
      ctx.lineWidth = 2;
      for (const gx of [w / 3, (w * 2) / 3]) {
        ctx.beginPath();
        ctx.moveTo(x + gx, cy + 18);
        ctx.lineTo(x + gx, cy + ch - 5);
        ctx.stroke();
      }
    }
  } else if (o.type === 'bicycle') {
    // 自転車（長めで高め）
    const wy = y + h - 20;
    for (const wx of [x + 22, x + w - 22]) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(wx, wy, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#B9B2B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx - 13, wy);
      ctx.lineTo(wx + 13, wy);
      ctx.moveTo(wx, wy - 13);
      ctx.lineTo(wx, wy + 13);
      ctx.stroke();
    }
    limb(
      ctx,
      [
        [x + 22, wy],
        [x + 46, y + 26],
        [x + 80, y + 26],
        [x + w - 22, wy],
      ],
      '#5BAA4A',
      4,
    );
    limb(
      ctx,
      [
        [x + 46, y + 26],
        [x + 58, wy],
        [x + 22, wy],
      ],
      '#5BAA4A',
      4,
    );
    limb(
      ctx,
      [
        [x + 80, y + 26],
        [x + 84, y + 10],
      ],
      '#4A3A40',
      3,
    );
    shape(ctx, '#4A3A40', () => ctx.roundRect(x + 34, y + 14, 22, 7, 3));
    shape(ctx, '#F2A541', () => ctx.roundRect(x + 84, y + 2, 28, 18, 3));
  } else {
    // 昼寝中の猫
    shape(ctx, '#F2A541', () => ctx.ellipse(x + 46, y + 28, 40, 16, 0, 0, Math.PI * 2));
    shape(ctx, '#F2A541', () => ctx.arc(x + 80, y + 22, 14, 0, Math.PI * 2));
    shape(ctx, '#F2A541', () => {
      ctx.moveTo(x + 70, y + 12);
      ctx.lineTo(x + 72, y);
      ctx.lineTo(x + 80, y + 9);
    });
    shape(ctx, '#F2A541', () => {
      ctx.moveTo(x + 84, y + 9);
      ctx.lineTo(x + 92, y);
      ctx.lineTo(x + 93, y + 14);
    });
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 76, y + 22);
    ctx.lineTo(x + 81, y + 22);
    ctx.moveTo(x + 85, y + 22);
    ctx.lineTo(x + 90, y + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 30);
    ctx.quadraticCurveTo(x - 6, y + 40, x + 4, y + 44);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.lineWidth = 2.5;
    for (const sx of [30, 46]) {
      ctx.beginPath();
      ctx.moveTo(x + sx, y + 14);
      ctx.lineTo(x + sx - 4, y + 24);
      ctx.stroke();
    }
    ctx.font = `16px ${fontFamily}`;
    ctx.fillStyle = C.ink;
    ctx.fillText('z', x + 90, y - 8 + Math.sin(t * 0.08) * 3);
  }
}

// ---------- 小僧 ----------
function drawKid(ctx: Ctx, state: GameState, caught: boolean, fontFamily: string): void {
  const k = state.kid;
  const x = KID.x;
  const y = k.y;
  const s = Math.sin(k.blocked ? state.t * 0.45 : k.run * 0.09);

  // 脚
  if (k.grounded) {
    limb(ctx, [[x + 20, y + 50], [x + 20 - 11 * s, y + 60], [x + 18 - 16 * s, y + 70]], C.skin, 7);
    limb(ctx, [[x + 26, y + 50], [x + 26 + 11 * s, y + 60], [x + 26 + 16 * s, y + 70]], C.skin, 7);
  } else {
    limb(ctx, [[x + 20, y + 50], [x + 10, y + 58], [x + 4, y + 68]], C.skin, 7);
    limb(ctx, [[x + 26, y + 50], [x + 38, y + 56], [x + 30, y + 66]], C.skin, 7);
  }
  // 半ズボンとランニングシャツ
  shape(ctx, '#3D5BA9', () => ctx.roundRect(x + 12, y + 42, 24, 14, 4));
  shape(ctx, '#FFFFFF', () => ctx.roundRect(x + 13, y + 24, 22, 22, 6));
  ctx.fillStyle = C.red;
  ctx.fillRect(x + 15, y + 33, 18, 4);
  // 腕（止まっている間は前に突き出して押す）
  if (k.blocked) limb(ctx, [[x + 28, y + 30], [x + 46, y + 32]], C.skin, 6);
  else limb(ctx, [[x + 24, y + 30], [x + 24 + 14 * s, y + 40]], C.skin, 6);
  // 頭（坊主）
  shape(ctx, C.skin, () => ctx.arc(x + 26, y + 13, 13, 0, Math.PI * 2));
  ctx.fillStyle = '#4A3A40';
  ctx.beginPath();
  ctx.arc(x + 26, y + 11, 13, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(x + 32, y + 14, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F28B82';
  ctx.beginPath();
  ctx.arc(x + 30, y + 19, 3, 0, Math.PI * 2);
  ctx.fill();
  // 汗
  ctx.fillStyle = '#7CC6F2';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + 10, y + 6 + ((state.t * 0.6) % 10), 3.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (caught) {
    ctx.font = `26px ${fontFamily}`;
    ctx.fillStyle = C.red;
    ctx.fillText('ひぃ〜', x + 36, y - 6);
  }
}

// ---------- 母ちゃん ----------
function drawMom(ctx: Ctx, state: GameState, caught: boolean, fontFamily: string): void {
  const x = KID.x - state.gap - MOM.w;
  const y = GROUND - MOM.h - state.momHop;
  const s = Math.sin(state.t * state.speed * 0.08);
  const wob = Math.sin(state.t * 0.4) * 6;

  // 脚
  limb(ctx, [[x + 44, y + 88], [x + 44 + 13 * s, y + 108]], C.skin, 8);
  limb(ctx, [[x + 58, y + 88], [x + 58 - 13 * s, y + 108]], C.skin, 8);
  // ワンピースとエプロン
  shape(ctx, '#7D6BB5', () => {
    ctx.moveTo(x + 38, y + 40);
    ctx.lineTo(x + 64, y + 40);
    ctx.lineTo(x + 74, y + 92);
    ctx.lineTo(x + 28, y + 92);
    ctx.closePath();
  });
  shape(ctx, '#FF9DB8', () => {
    ctx.moveTo(x + 42, y + 54);
    ctx.lineTo(x + 62, y + 54);
    ctx.lineTo(x + 66, y + 88);
    ctx.lineTo(x + 38, y + 88);
    ctx.closePath();
  });
  ctx.fillStyle = '#fff';
  for (const [dx, dy] of [
    [48, 64],
    [57, 74],
    [46, 80],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // 腕：サンダルを振り上げる
  limb(ctx, [[x + 42, y + 46], [x + 30, y + 64 + s * 4]], C.skin, 7);
  limb(ctx, [[x + 60, y + 46], [x + 72, y + 32], [x + 76 + wob * 0.3, y + 14]], C.skin, 7);
  ctx.save();
  ctx.translate(x + 78 + wob * 0.3, y + 6);
  ctx.rotate(-0.5 + wob * 0.04);
  shape(ctx, C.red, () => ctx.ellipse(0, -8, 9, 18, 0, 0, Math.PI * 2));
  ctx.restore();
  // 顔とパーマ
  shape(ctx, C.skin, () => ctx.arc(x + 52, y + 24, 15, 0, Math.PI * 2));
  for (const [dx, dy, r] of [
    [38, 12, 9],
    [46, 6, 9],
    [56, 6, 8],
    [36, 24, 8],
    [40, 34, 6],
  ]) {
    shape(ctx, '#5E4458', () => ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2), 2.5);
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 54, y + 16);
  ctx.lineTo(x + 64, y + 21);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(x + 59, y + 23, 2.2, 0, Math.PI * 2);
  ctx.fill();
  shape(ctx, '#C0392B', () => ctx.ellipse(x + 60, y + 32, 4, 5, 0, 0, Math.PI * 2), 2);
  // 怒りマーク
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 3;
  const ax = x + 30;
  const ay = y - 4;
  ctx.beginPath();
  ctx.moveTo(ax, ay + 4);
  ctx.lineTo(ax + 4, ay + 4);
  ctx.lineTo(ax + 4, ay);
  ctx.moveTo(ax + 10, ay);
  ctx.lineTo(ax + 10, ay + 4);
  ctx.lineTo(ax + 14, ay + 4);
  ctx.moveTo(ax + 14, ay + 10);
  ctx.lineTo(ax + 10, ay + 10);
  ctx.lineTo(ax + 10, ay + 14);
  ctx.moveTo(ax + 4, ay + 14);
  ctx.lineTo(ax + 4, ay + 10);
  ctx.lineTo(ax, ay + 10);
  ctx.stroke();

  if (caught) bubble(ctx, x + 70, y - 20, 'つかまえた！', fontFamily);
  else if (dangerOf(state) >= FX.bubbleDanger) bubble(ctx, x + 70, y - 20, 'まちなさーい！', fontFamily);
}

/** 1フレーム分を描画する */
export function drawScene(ctx: Ctx, state: GameState, { caught, fontFamily }: DrawOptions): void {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawBackground(ctx, state.dist);
  for (const o of state.obstacles) drawObstacle(ctx, o, state.t, fontFamily);
  drawMom(ctx, state, caught, fontFamily);
  drawKid(ctx, state, caught, fontFamily);
}
