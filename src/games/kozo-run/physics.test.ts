import { GROUND, JUMP, KID } from './constants';
import { createKid, makeObstacle, pressJump, releaseJump, stepBody, type Body } from './physics';

function body(): Body {
  return { kid: createKid(), obstacles: [], speed: 13 };
}

/** 押してから hold フレーム後に離したときの、最高到達点の高さ(px) */
function peak(hold: number): number {
  const b = body();
  pressJump(b.kid);
  let max = 0;
  for (let f = 0; f < 200; f++) {
    if (f === hold) releaseJump(b.kid);
    stepBody(b, 1);
    max = Math.max(max, GROUND - KID.h - b.kid.y);
    if (b.kid.grounded) break;
  }
  return max;
}

describe('ジャンプ（押す長さで高さが変わる）', () => {
  it('長く押すほど高く跳ぶ', () => {
    const heights = [0, 2, 4, 6, 9].map(peak);
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThan(heights[i - 1]);
  });

  it('一瞬のタップで約 80px、上限（0.15秒）まで押すと約 187px', () => {
    expect(peak(0)).toBeCloseTo(80, -1);
    expect(peak(JUMP.maxHoldFrames)).toBeCloseTo(187, -1);
  });

  it('上限（maxHoldFrames）より長く押しても、それ以上は高くならない', () => {
    expect(peak(60)).toBe(peak(JUMP.maxHoldFrames));
  });

  it('地面か障害物の上に立っているときだけ跳べる（2段ジャンプ不可）', () => {
    const b = body();
    expect(pressJump(b.kid)).toBe(true);
    stepBody(b, 1);
    expect(pressJump(b.kid)).toBe(false);
  });

  it('着地すると、押したままでも押している扱いは終わる', () => {
    const b = body();
    pressJump(b.kid);
    for (let f = 0; f < 100 && !b.kid.grounded; f++) stepBody(b, 1);
    expect(b.kid.grounded).toBe(true);
    expect(b.kid.holding).toBe(false);
  });
});

describe('障害物との当たり', () => {
  it('側面にぶつかっている間は進めない', () => {
    const b = body();
    b.obstacles.push(makeObstacle('small', KID.x + KID.w));
    expect(stepBody(b, 1)).toBe(0);
    expect(b.kid.blocked).toBe(true);
  });

  it('上面には着地できる', () => {
    const b = body();
    const o = makeObstacle('small', KID.x - 5);
    b.obstacles.push(o);
    b.kid.y = GROUND - o.h - KID.h - 0.5;
    b.kid.grounded = false;
    stepBody(b, 1);
    expect(b.kid.grounded).toBe(true);
    expect(b.kid.y + KID.h).toBe(GROUND - o.h);
  });
});
