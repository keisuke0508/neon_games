import { DIFFICULTY, GAP, KID, LEVELED, PX_PER_M, SPAWN } from './constants';
import { COMBOS, SINGLE_TEMPLATES, planFor } from './course';
import {
  autopilot,
  chooseUpcoming,
  createState,
  dangerOf,
  leveled,
  levelAt,
  metersOf,
  speedAt,
  step,
  type GameState,
} from './engine';
import { makeObstacle } from './physics';

const fixed = (v: number) => () => v;

/** 再現できる乱数（mulberry32） */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('難易度', () => {
  it('100m ごとにレベルが上がり、1000m で最高レベル（10）になる', () => {
    expect([0, 99, 100, 999, 1000, 5000].map(levelAt)).toEqual([0, 0, 1, 9, 10, 10]);
  });

  it('走る速さは 15 から始まり、最高レベル（1000m）で 17', () => {
    expect(speedAt(0)).toBe(15);
    expect(speedAt(500)).toBeCloseTo(16);
    expect(speedAt(1000)).toBe(17);
    expect(speedAt(3000)).toBe(17);
  });

  it('レベルが上がるほど、ぶつかってからつかまるまでが短い', () => {
    const framesToCatch = (level: number) => GAP.max / leveled(LEVELED.catchRate, level);
    expect(framesToCatch(0)).toBeCloseTo(48.8, 1);
    expect(framesToCatch(DIFFICULTY.maxLevel)).toBeCloseTo(40);
  });

  it('最初から長め・高めの障害物と2つ並びが出て、レベルが上がるとさらに増える', () => {
    const typesAt = (level: number) => {
      const random = seeded(level + 1);
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) seen.add(chooseUpcoming(level, false, random).template.id);
      return seen;
    };
    expect([...typesAt(0)].sort()).toEqual(['bench', 'crates', 'small', 'small+small', 'small+tall', 'tall', 'wide', 'wide+small']);
    const top = typesAt(DIFFICULTY.maxLevel);
    for (const t of [...SINGLE_TEMPLATES, ...COMBOS]) expect(top).toContain(t.id);
  });
});

describe('走りとスクロール', () => {
  it('何もなければ速さ × dt だけ進み、距離は 40px = 1m で換算する', () => {
    const s = createState(false);
    step(s, 1, fixed(0));
    expect(s.dist).toBe(15);
    s.dist = PX_PER_M * 12 + 39;
    expect(metersOf(s)).toBe(12);
  });

  it('最初の障害物は 700px 先で出現する', () => {
    const s = createState(false);
    while (s.dist < SPAWN.first - 15) step(s, 1, fixed(0));
    expect(s.clusters).toHaveLength(0);
    step(s, 1, fixed(0));
    expect(s.clusters).toHaveLength(1);
    expect(s.clusters[0].x).toBe(SPAWN.x);
  });
});

describe('母ちゃん', () => {
  it('止まり続けるとつかまる', () => {
    const s = createState(false);
    s.obstacles.push(makeObstacle('tall', KID.x + KID.w));
    let caught = false;
    let frames = 0;
    while (!caught && frames < 200) {
      caught = step(s, 1, fixed(0));
      frames++;
    }
    expect(caught).toBe(true);
    expect(frames).toBe(Math.ceil(GAP.max / leveled(LEVELED.catchRate, 0)));
    expect(dangerOf(s)).toBe(1);
    expect(step(s, 1, fixed(0))).toBe(false);
  });

  it('走れている間は距離が広がる（最大 200）', () => {
    const s = createState(false);
    s.gap = 100;
    step(s, 1, fixed(0));
    expect(s.gap).toBeCloseTo(100 + GAP.recoverRate);
  });

  it('デモではつかまらない', () => {
    const s = createState(true);
    s.obstacles.push(makeObstacle('tall', KID.x + KID.w));
    for (let i = 0; i < 300; i++) step(s, 1, fixed(0));
    expect(s.caught).toBe(false);
  });
});

describe('絶対に越えられない障害物は出ない', () => {
  it('どの障害物・並びも、出現するレベルのすべての速さで、越えられるタイミングがある', () => {
    for (let level = 0; level <= DIFFICULTY.maxLevel; level++) {
      for (const t of [...SINGLE_TEMPLATES, ...COMBOS]) {
        if (t.minLevel > level) continue;
        expect({ id: t.id, level, ok: planFor(t, leveled(LEVELED.speed, level)) !== null }).toEqual({
          id: t.id,
          level,
          ok: true,
        });
      }
    }
  });

  /** 自動操縦で、ぶつからずに走り続けられるか */
  function runBot(seed: number, meters: number, nextDt: () => number) {
    const random = seeded(seed);
    const s: GameState = createState(false);
    let blockedFrames = 0;
    let clusters = 0;
    let lastCount = 0;
    while (metersOf(s) < meters && !s.caught) {
      step(s, nextDt(), random);
      autopilot(s);
      if (s.kid.blocked) blockedFrames++;
      if (s.clusters.length > lastCount) clusters++;
      lastCount = s.clusters.length;
    }
    return { blockedFrames, caught: s.caught, meters: metersOf(s), clusters };
  }

  it.each([1, 2, 3, 4, 5])('乱数 %i：最高レベルを超えて 1500m まで、一度もぶつからずに走れる（60fps）', (seed) => {
    const result = runBot(seed, 1500, () => 1);
    expect(result).toMatchObject({ blockedFrames: 0, caught: false, meters: 1500 });
    expect(result.clusters).toBeGreaterThan(50);
  });

  it.each([
    ['120fps', () => 0.5],
    ['ばらつく（40〜75fps）', (() => {
      const r = seeded(99);
      return () => 0.8 + r() * 0.7;
    })()],
  ])('フレームレートが %s でも、一度もぶつからずに走れる', (_, dt) => {
    expect(runBot(7, 1200, dt)).toMatchObject({ blockedFrames: 0, caught: false });
  });

  it('障害物の並び同士の間隔は、レベルが上がるほど狭くなる', () => {
    const averageGap = (level: number) => {
      const random = seeded(3);
      const s = createState(false);
      s.dist = level * 100 * PX_PER_M;
      const gaps: number[] = [];
      for (let i = 0; i < 300; i++) {
        s.nextObstacle = 0;
        step(s, 0, random);
        const c = s.clusters[s.clusters.length - 1];
        gaps.push(s.nextObstacle - c.span);
      }
      return gaps.reduce((a, b) => a + b, 0) / gaps.length / leveled(LEVELED.speed, level);
    };
    // 速さで割った「時間」で比べる
    expect(averageGap(DIFFICULTY.maxLevel)).toBeLessThan(averageGap(0) * 0.9);
  });

});
